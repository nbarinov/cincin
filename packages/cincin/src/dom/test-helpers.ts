/** Creates a parented element attached to the document. */
function makeElement(): HTMLElement {
  const parent = document.createElement('div');
  const element = document.createElement('div');
  parent.append(element);
  document.body.append(parent);
  return element;
}

export { makeElement };
