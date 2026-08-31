function textDirection(element: Element): 'ltr' | 'rtl' {
  const attribute = element.getAttribute('dir');

  if (attribute === 'rtl' || attribute === 'ltr') {
    return attribute;
  }

  return getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr';
}

function observeTextDirection(
  element: Element,
  onChange: () => void
): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['dir'],
  });

  return () => observer.disconnect();
}

export { textDirection, observeTextDirection };
