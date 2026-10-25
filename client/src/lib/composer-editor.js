"use client";;
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useComposerEditor } from "@/hooks/use-composer-editor";

const ComposerEditorContext =
  createContext(null);

function useComposerEditorContext() {
  return useContext(ComposerEditorContext);
}

function useComposerContext() {
  const context = useComposerEditorContext();
  if (!context)
    throw new Error("useComposerContext must be used within Composer.");
  const {
    value,
    isEmpty,
    canSubmit,
    disabled,
    readOnly,
    status,
    submit,
    insertTrigger,
    reset,
  } = context;
  return {
    value,
    isEmpty,
    canSubmit,
    disabled,
    readOnly,
    status,
    submit,
    insertTrigger,
    reset,
  };
}

function useComposerAnchorContext() {
  return useComposerEditorContext()?.rootRef;
}

const emptyValue = [];

function ComposerEditorProvider(
  {
    value: controlledValue,
    defaultValue = emptyValue,
    onValueChange,
    getSuggestionsAnnouncement,
    children,
    ...options
  }
) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const editor = useComposerEditor({
    ...options,
    value: controlledValue ?? uncontrolledValue,
    onValueChange: (nextValue, details) => {
      if (controlledValue === undefined) setUncontrolledValue(nextValue);
      onValueChange?.(nextValue, details);
    },
  });
  const reset = () => editor.reset(defaultValue);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    const form = editor.rootRef.current?.closest("form");
    if (!form) return;
    const onReset = (event) => {
      queueMicrotask(() => {
        if (!event.defaultPrevented) resetRef.current();
      });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  });

  return createElement(
    ComposerEditorContext.Provider,
    { value: { ...editor, reset } },
    createElement(
      ComposerSuggestions,
      { ...editor.suggestions, getSuggestionsAnnouncement },
      children,
    ),
  );
}

const ComposerSuggestionsContext =
  createContext(null);
function useComposerSuggestionsContext() {
  return useContext(ComposerSuggestionsContext);
}

function defaultAnnouncement(count) {
  return `${count} suggestion${count === 1 ? "" : "s"} available. Use the up and down arrow keys to navigate.`;
}

function ComposerSuggestions(
  {
    enabled,
    items,
    open,
    onOpenChange,
    onItemSelect,
    getSuggestionsAnnouncement = defaultAnnouncement,
    submitOnEmptySuggestions,
    children
  }
) {
  const listId = useId();
  const [highlightedValue, setHighlightedValue] = useState();
  const [registered, setRegistered] = useState(() => new Map());
  const [listElement, registerList] = useState(null);
  const registerItem = useCallback(
    (id, item) => {
      setRegistered((previous) => {
        const next = new Map(previous);
        if (item) next.set(id, item);
        else next.delete(id);
        return next;
      });
    },
    [],
  );
  const enabledItems = items.filter(
    (item) =>
      !item.disabled &&
      registered.has(item.id) &&
      !registered.get(item.id)?.disabled,
  );
  const highlightedId =
    enabledItems.find((item) => item.id === highlightedValue)?.id ??
    enabledItems[0]?.id;

  function selectItem(value) {
    const item = enabledItems.find((item) => item.id === value.id);
    if (!open || !item) return;
    onItemSelect(item);
    onOpenChange(false);
    setHighlightedValue(undefined);
  }

  function onKeyDown(event) {
    if (
      !open ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      setHighlightedValue(undefined);
    } else if (
      event.key === "Tab" ||
      (event.key === "Enter" && event.shiftKey)
    ) {
      onOpenChange(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!enabledItems.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const index = enabledItems.findIndex((item) => item.id === highlightedId);
      const item =
        enabledItems[
          (index + direction + enabledItems.length) % enabledItems.length
        ];
      if (!item) return;
      setHighlightedValue(item.id);
      registered.get(item.id)?.element.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && !event.shiftKey) {
      if (!enabledItems.length && submitOnEmptySuggestions) return;
      event.preventDefault();
      const item = enabledItems.find((item) => item.id === highlightedId);
      if (item) selectItem(item);
    }
  }

  return createElement(
    ComposerSuggestionsContext.Provider,
    {
      value: {
        items,
        listId,
        highlightedId,
        registerItem,
        registerList,
        inputProps: {
          "aria-autocomplete": enabled ? "list" : undefined,
          "aria-haspopup": enabled ? "listbox" : undefined,
          "aria-controls": open ? listElement?.id || undefined : undefined,
          "aria-activedescendant":
            open && listElement && highlightedId
              ? registered.get(highlightedId)?.element.id || undefined
              : undefined,
          onKeyDown,
        },
        highlightItem: (value) => setHighlightedValue(value.id),
        selectItem,
      },
    },
    createElement(
      PopoverPrimitive.Root,
      {
        open,
        onOpenChange: (nextOpen) => {
          if (!nextOpen) setHighlightedValue(undefined);
          onOpenChange(nextOpen);
        },
      },
      children,
      createElement(
        "span",
        {
          role: "status",
          "aria-atomic": true,
          style: {
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          },
        },
        open && listElement && enabledItems.length
          ? getSuggestionsAnnouncement(enabledItems.length)
          : "",
      ),
    ),
  );
}

function useComposerItem(
  value,
  disabled,
) {
  const suggestions = useComposerSuggestionsContext();
  const registerItem = suggestions?.registerItem;
  const id = value?.id;
  const ref = useCallback(
    (element) => {
      if (id !== undefined)
        registerItem?.(id, element ? { element, disabled } : null);
    },
    [id, disabled, registerItem],
  );
  const highlighted = id !== undefined && id === suggestions?.highlightedId;
  return {
    ref,
    highlighted,
    props: {
      id:
        id !== undefined && suggestions
          ? `${suggestions.listId}-${encodeURIComponent(id)}`
          : undefined,
      role: suggestions ? "option" : undefined,
      tabIndex: suggestions ? -1 : undefined,
      "aria-selected": suggestions ? highlighted : undefined,
      "aria-disabled": disabled || undefined,
      "data-highlighted": highlighted ? "" : undefined,
      "data-disabled": disabled ? "" : undefined,
      onPointerMove: () => {
        if (!disabled && value) suggestions?.highlightItem(value);
      },
      onClick: () => {
        if (!disabled && value) suggestions?.selectItem(value);
      },
      onMouseDown: (event) => {
        if (suggestions) event.preventDefault();
      },
    },
  };
}

function focusComposerInput(event, preventDefault) {
  if (event.defaultPrevented || !(event.target instanceof Element)) return;
  const interactive = event.target.closest(
    "button, a, input, select, textarea, label, summary, [data-slot='composer-input'], [contenteditable], [role='button'], [role='combobox'], [role='menuitem'], [tabindex]:not([tabindex='-1'])",
  );
  if (
    interactive &&
    interactive !== event.currentTarget &&
    event.currentTarget.contains(interactive)
  )
    return;
  const input = event.currentTarget.querySelector('[data-slot="composer-input"]');
  if (!input || input.matches(":disabled, [aria-disabled='true']")) return;
  if (preventDefault) event.preventDefault();
  input.focus();
}

function useComposerInputLayout() {
  const editor = useComposerEditorContext();
  const scrollRef = useRef(null);
  const [input, setInput] = useState(null);
  const scheduleMeasureRef = useRef(null);
  useLayoutEffect(() => {
    for (const host of editor?.tokenHosts ?? []) {
      const fallback = host.previousElementSibling;
      if (fallback instanceof HTMLElement) fallback.hidden = true;
    }
  }, [editor?.tokenHosts]);
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !input) return;
    const frame = scroll.closest('[data-slot="composer"]');
    const controls = new Set();
    let animationFrame = null;

    function scheduleMeasure() {
      if (animationFrame !== null) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        measure();
      });
    }

    const observer = new ResizeObserver(scheduleMeasure);

    function measure() {
      if (!scroll || !input) return;
      // Observe the groups themselves: their wrapper has no box in compact mode.
      // Reconcile here so conditional controls don't require a new observer.
      const nextControls = new Set(
        frame?.querySelectorAll(
          ':scope > [data-slot="composer-actions"] > [data-slot="composer-action-group"]'
        ),
      );
      for (const control of controls) {
        if (!nextControls.has(control)) {
          observer.unobserve(control);
          controls.delete(control);
        }
      }
      for (const control of nextControls) {
        if (!controls.has(control)) {
          observer.observe(control);
          controls.add(control);
        }
      }
      const style = getComputedStyle(input);
      const lineHeight =
        Number.parseFloat(style.lineHeight) ||
        Number.parseFloat(style.fontSize) * 1.2;
      const padding =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom);
      for (const [property, value] of [
        ["--composer-line-height", `${lineHeight}px`],
        ["--composer-input-padding", `${padding}px`]
      ]) {
        if (scroll.style.getPropertyValue(property) !== value) {
          scroll.style.setProperty(property, value);
        }
      }
      if (!frame || frame.dataset.layout !== "adaptive" || !controls.size) {
        frame?.removeAttribute("data-multiline");
        return;
      }
      const minRows = Number.parseFloat(
        style.getPropertyValue("--composer-min-rows"),
      );
      if (minRows > 1) {
        frame.toggleAttribute("data-multiline", true);
        return;
      }

      // Measure at the narrow, one-line width even after the actions move below.
      // This keeps the layout from oscillating when full-width text fits one line.
      frame.removeAttribute("data-multiline");
      const minHeight = input.style.getPropertyValue("min-height");
      const minHeightPriority = input.style.getPropertyPriority("min-height");
      input.style.setProperty("min-height", "0px", "important");
      const contentHeight = input.scrollHeight;
      if (minHeight) {
        input.style.setProperty("min-height", minHeight, minHeightPriority);
      } else {
        input.style.removeProperty("min-height");
      }
      frame.toggleAttribute(
        "data-multiline",
        contentHeight > lineHeight * 1.5 + padding,
      );
    }
    scheduleMeasureRef.current = scheduleMeasure;
    measure();
    observer.observe(input);
    if (frame) observer.observe(frame);
    input.addEventListener("input", scheduleMeasure);
    window.addEventListener("resize", scheduleMeasure);
    document.fonts.addEventListener("loadingdone", scheduleMeasure);
    return () => {
      scheduleMeasureRef.current = null;
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      observer.disconnect();
      input.removeEventListener("input", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      document.fonts.removeEventListener("loadingdone", scheduleMeasure);
    };
  }, [input]);
  // Controlled drafts, layout props, and conditional actions can change without
  // an input event. Coalesce these commits with input and resize notifications.
  useLayoutEffect(() => {
    scheduleMeasureRef.current?.();
  });
  return { scrollRef, inputRef: setInput };
}

export { getComposerText, useComposerFilter } from "@/hooks/use-composer-editor";
export {
  ComposerEditorProvider,
  focusComposerInput,
  useComposerAnchorContext,
  useComposerContext,
  useComposerEditorContext,
  useComposerInputLayout,
  useComposerItem,
  useComposerSuggestionsContext,
};
