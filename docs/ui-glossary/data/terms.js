/* ------------------------------------------------------------------------- *
 * kamy jemput — UI glossary source of truth.
 *
 * Everything the artifact renders comes from this file. To document a new UI
 * part you add a target to a plate wireframe and a term that points at it;
 * `node validate.mjs` fails the pair if either half is missing.
 *
 * Plain script (not an ES module) so index.html opens straight from file://
 * without a server. See README.md.
 * ------------------------------------------------------------------------- */

window.KAMY_GLOSSARY = {
  meta: {
    title: "kamy jemput UI glossary",
    // Bump when terms change. `derivedFrom` is the commit the terms were read at.
    derivedFrom: "191f623",
    updated: "2026-09-13",
    intent:
      "One canonical name per interface part, so a prompt says exactly which thing to change.",
  },

  /* Requirement: layout regions, components, controls, content fields, states,
     interactions are kept distinct — a prompt author picks a different kind of
     word depending on what they are changing. */
  categories: [
    { id: "region", label: "Layout region", hint: "A named area of a page. Prompts use these to scope a change." },
    { id: "component", label: "Component", hint: "A reusable React unit with its own file." },
    { id: "control", label: "Control", hint: "Something a person clicks, presses, or toggles." },
    { id: "field", label: "Content field", hint: "A content slot — an editable card value, a DB-backed figure, or fixed page copy. The definition says which." },
    { id: "state", label: "State", hint: "A condition the interface can be in." },
    { id: "interaction", label: "Interaction", hint: "A behaviour triggered by pointer, key, or timer." },
  ],

  plates: [],
  terms: [],
  avoid: [],
  gaps: [],
}
