/* ==========================================================================
   kamy jemput — UI glossary behaviour.
   Plain script, no build step, no dependency. Everything renders from
   window.KAMY_GLOSSARY (data/) and window.KAMY_GLOSSARY_SHOTS (screenshots/).
   ========================================================================== */
(function () {
  "use strict"

  var G = window.KAMY_GLOSSARY
  var SHOTS = window.KAMY_GLOSSARY_SHOTS || null

  var catById = {}
  G.categories.forEach(function (c) { catById[c.id] = c })
  var plateById = {}
  G.plates.forEach(function (p) { plateById[p.id] = p })
  var termById = {}
  G.terms.forEach(function (t) { termById[t.id] = t })

  /* terms grouped by plate, in authored order — this order is the plate numbering */
  var termsByPlate = {}
  G.plates.forEach(function (p) { termsByPlate[p.id] = [] })
  G.terms.forEach(function (t) { termsByPlate[t.plate].push(t) })
  Object.keys(termsByPlate).forEach(function (pid) {
    termsByPlate[pid].forEach(function (t, i) { t._n = i + 1 })
  })

  /* ------------------------------------------------------------- state */
  var state = {
    plate: G.plates[0].id,
    selected: null,   // term id
    hot: null,        // term id under hover/focus
    query: "",
    cats: {},         // cat id -> true when filtered in
    view: "wireframe",
    shotWidth: null,
    width: "desktop",   // simulated viewport for the wireframe

  }

  var $ = function (id) { return document.getElementById(id) }
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  /* -------------------------------------------------------- provenance */
  function renderProvenance() {
    var rows = [
      ["Derived from", G.meta.derivedFrom + " · " + G.meta.updated],
      ["Coverage", G.terms.length + " terms · " + G.plates.length + " interfaces"],
      ["Visuals", countShots() + " screenshots · " + G.plates.length + " wireframes"],
      ["Check", "node validate.mjs"],
    ]
    if (SHOTS) {
      var verdict = SHOTS.staleness ? SHOTS.staleness.verdict : "unknown"
      rows.splice(3, 0, [
        "Captured",
        SHOTS.capturedAt.slice(0, 10) + " @ " + SHOTS.commit +
          (verdict === "stale" ? "  (older than the UI)" : ""),
      ])
    }
    var frag = document.createDocumentFragment()
    rows.forEach(function (r) {
      var d = el("div")
      d.appendChild(el("dt", null, r[0]))
      d.appendChild(el("dd", null, r[1]))
      frag.appendChild(d)
    })
    $("prov").appendChild(frag)
  }
  /* validate.mjs writes this verdict into the manifest. The page cannot run git,
     so it reports what it was told rather than guessing. */
  function shotsAreStale() {
    return !!(SHOTS && SHOTS.staleness && SHOTS.staleness.verdict === "stale")
  }

  function staleSentence() {
    var st = SHOTS.staleness
    return "This capture is older than the code. It was taken at " + st.capturedCommit +
      ", and app/ or components/ changed at " + st.uiCommit + " on " + st.uiChangedAt +
      ". The wireframe is current. Re-run capture.mjs to refresh."
  }

  function countShots() {
    var n = 0
    G.plates.forEach(function (p) { n += Object.keys(p.screenshots || {}).length })
    return n
  }

  /* ------------------------------------------------------------ filters */
  function renderFilters() {
    var pf = $("plate-filters")
    G.plates.forEach(function (p) {
      var b = el("button", "chip")
      b.type = "button"
      b.setAttribute("aria-pressed", String(p.id === state.plate))
      b.dataset.plate = p.id
      b.appendChild(document.createTextNode(p.name))
      var n = el("span", "chip-n", String(termsByPlate[p.id].length))
      b.appendChild(n)
      b.addEventListener("click", function () { selectPlate(p.id) })
      pf.appendChild(b)
    })

    var cf = $("cat-filters")
    G.categories.forEach(function (c) {
      state.cats[c.id] = true
      var b = el("button", "chip")
      b.type = "button"
      b.dataset.cat = c.id
      b.setAttribute("aria-pressed", "true")
      b.title = c.hint
      b.textContent = c.label
      b.addEventListener("click", function () {
        state.cats[c.id] = !state.cats[c.id]
        b.setAttribute("aria-pressed", String(state.cats[c.id]))
        renderRail()
        renderLabels()
        drawLeaders()
      })
      cf.appendChild(b)
    })
  }

  function syncPlateChips() {
    Array.prototype.forEach.call($("plate-filters").children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.plate === state.plate))
    })
  }

  /* ------------------------------------------------------------- search */
  function matches(t) {
    if (!state.cats[t.cat]) return false
    var q = state.query
    if (!q) return true
    var hay = [
      t.name, t.id, t.target, t.def, t.note || "", t.prompt,
      (t.aliases || []).join(" "), (t.src || []).join(" "),
      catById[t.cat].label, plateById[t.plate].name, plateById[t.plate].route,
    ].join(" ").toLowerCase()
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1 })
  }

  /* --------------------------------------------------------------- rail */
  function renderRail() {
    var list = $("rail-list")
    list.textContent = ""
    var total = 0

    G.plates.forEach(function (p) {
      var hits = termsByPlate[p.id].filter(matches)
      if (!hits.length) return
      total += hits.length
      list.appendChild(el("p", "rail-plate", p.name))
      hits.forEach(function (t) {
        var b = el("button", "rail-item")
        b.type = "button"
        b.dataset.term = t.id
        if (t.id === state.selected) b.classList.add("is-on")
        if (t.id === state.hot) b.classList.add("is-hot")
        var nm = el("span", "ri-name", t.name)
        var ct = el("span", "ri-cat", catById[t.cat].label + " · " + t.target)
        b.appendChild(nm); b.appendChild(ct)
        b.addEventListener("click", function () { selectTerm(t.id, true) })
        b.addEventListener("mouseenter", function () { setHot(t.id) })
        b.addEventListener("mouseleave", function () { setHot(null) })
        b.addEventListener("focus", function () { setHot(t.id) })
        b.addEventListener("blur", function () { setHot(null) })
        list.appendChild(b)
      })
    })

    if (!total) {
      var e = el("p", "rail-empty", "No term matches. Try a file name, an alias, or clear the kind filters.")
      list.appendChild(e)
    }
    $("rail-count").textContent = total + " of " + G.terms.length + " terms shown"
    $("q-clear").hidden = !state.query
  }

  /* ------------------------------------------------- wireframe rendering */
  function buildNode(spec) {
    var n = el("div", spec.c || null)
    if (spec.t) {
      n.dataset.target = spec.t
      n.tabIndex = 0
      n.setAttribute("role", "button")
    }
    if (spec.x != null) n.appendChild(document.createTextNode(spec.x))
    ;(spec.k || []).forEach(function (kid) { n.appendChild(buildNode(kid)) })
    return n
  }

  function renderFigure() {
    var plate = plateById[state.plate]
    var body = $("figure-body")
    body.textContent = ""
    body.appendChild(buildNode(plate.wireframe))

    /* number every target and wire its reciprocal highlight */
    termsByPlate[plate.id].forEach(function (t) {
      var node = body.querySelector('[data-target="' + t.target + '"]')
      if (!node) return
      /* One marker per target. Several terms can share a target (a state or an
         interaction sits on the same part as the component), so the marker
         carries the first term's number by default and swaps to whichever term
         is active — otherwise the reciprocal highlight would point at the
         wrong number. */
      if (!node.querySelector(":scope > .tmark")) {
        var m = el("span", "tmark", String(t._n))
        m.dataset.default = String(t._n)
        node.appendChild(m)
      }
      node.setAttribute("aria-label", t.name + " — " + catById[t.cat].label)
      node.addEventListener("mouseenter", function () { setHot(t.id) })
      node.addEventListener("mouseleave", function () { setHot(null) })
      node.addEventListener("focus", function () { setHot(t.id) })
      node.addEventListener("blur", function () { setHot(null) })
      node.addEventListener("click", function (e) { e.stopPropagation(); selectTerm(t.id) })
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTerm(t.id) }
      })
    })
  }

  /* ------------------------------------------------------------- labels */
  function renderLabels() {
    var ul = $("labels-list")
    ul.textContent = ""
    termsByPlate[state.plate].forEach(function (t) {
      var li = el("li")
      var b = el("button", "label-btn")
      b.type = "button"
      b.dataset.term = t.id
      if (!matches(t)) b.classList.add("is-dim")
      if (t.id === state.selected) b.classList.add("is-on")
      if (t.id === state.hot) b.classList.add("is-hot")
      b.appendChild(el("span", "label-n", String(t._n)))
      var txt = el("span", "label-txt")
      txt.appendChild(el("span", "label-name", t.name))
      var cat = el("span", "label-cat", catById[t.cat].label)
      txt.appendChild(cat)
      b.appendChild(txt)
      /* measured after the figure is in the DOM — see markAbsentLabels() */
      b.addEventListener("click", function () { selectTerm(t.id) })
      b.addEventListener("mouseenter", function () { setHot(t.id) })
      b.addEventListener("mouseleave", function () { setHot(null) })
      b.addEventListener("focus", function () { setHot(t.id) })
      b.addEventListener("blur", function () { setHot(null) })
      li.appendChild(b)
      ul.appendChild(li)
    })
  }

  /* Nested parts all mark their own top-left corner (a grid, its cell, and the
     phone inside it), so the badges would stack. Step each one right by its
     nesting depth, clamped so it never leaves the part it belongs to. Run after
     layout, since it needs real widths. */
  function positionMarkers() {
    var root = $("figure-body")
    Array.prototype.forEach.call(root.querySelectorAll("[data-target] > .tmark"), function (mark) {
      var node = mark.parentElement
      var depth = 0
      for (var p = node.parentElement; p && p !== root; p = p.parentElement) {
        if (p.hasAttribute("data-target")) depth++
      }
      var w = node.getBoundingClientRect().width
      mark.style.left = Math.max(1, Math.min(1 + depth * 17, w - 17)) + "px"
    })
  }

  /* Flag the chips whose part the product does not render at this width. */
  function markAbsentLabels() {
    termsByPlate[state.plate].forEach(function (t) {
      var chip = $("labels-list").querySelector('[data-term="' + t.id + '"]')
      var node = $("figure-body").querySelector('[data-target="' + t.target + '"]')
      if (!chip) return
      var absent = !node || !isRendered(node.getBoundingClientRect())
      chip.classList.toggle("is-absent", absent)
      var existing = chip.querySelector(".label-only")
      if (absent && !existing) {
        chip.querySelector(".label-txt").appendChild(
          el("span", "label-only", "hidden at " + (state.width === "desktop" ? "1280" : "390"))
        )
      } else if (!absent && existing) {
        existing.remove()
      }
    })
  }

  /* ------------------------------------------------------- leader lines */
  var SVG_NS = "http://www.w3.org/2000/svg"

  function drawLeaders() {
    var svg = $("leaders")
    var wrap = $("connector")
    svg.textContent = ""
    if (state.view !== "wireframe") return
    positionMarkers()
    markAbsentLabels()

    var box = wrap.getBoundingClientRect()
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height)
    svg.setAttribute("width", box.width)
    svg.setAttribute("height", box.height)

    /* Stacked layout: the label column sits under the figure, so a full web of
       lines would cross the mock. Numbered markers carry the mapping there and
       only the active line is drawn (the CSS hides the rest). */
    var stacked = window.matchMedia("(max-width: 960px)").matches
    var scrollBox = $("figure-scroll").getBoundingClientRect()

    termsByPlate[state.plate].forEach(function (t) {
      if (!matches(t) && t.id !== state.selected && t.id !== state.hot) return
      var chip = $("labels-list").querySelector('[data-term="' + t.id + '"]')
      var node = $("figure-body").querySelector('[data-target="' + t.target + '"]')
      if (!chip || !node) return

      var c = chip.getBoundingClientRect()
      var n = node.getBoundingClientRect()
      if (!isRendered(n) || !isRendered(c)) return

      var x1, y1, x2, y2, d

      if (stacked) {
        x1 = c.left + c.width / 2 - box.left
        y1 = c.top - box.top
        x2 = n.left + n.width / 2 - box.left
        y2 = n.bottom - box.top
        if (!anchorVisible(n.left + n.width / 2, scrollBox)) return
        var my = (y1 + y2) / 2
        d = "M" + x1 + "," + y1 + " C" + x1 + "," + my + " " + x2 + "," + my + " " + x2 + "," + y2
      } else {
        /* chip's left edge → the target's right edge, or its left edge when the
           target sits to the right of the chip (never happens today, but the
           maths should not assume). */
        x1 = c.left - box.left - 4
        y1 = c.top + c.height / 2 - box.top
        var useRight = n.right - box.left < x1
        var anchorX = useRight ? n.right : n.left
        if (!anchorVisible(anchorX, scrollBox)) return
        x2 = anchorX - box.left + (useRight ? 2 : -2)
        y2 = n.top + n.height / 2 - box.top
        var mx = (x1 + x2) / 2
        d = "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2
      }

      var path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", d)
      path.dataset.term = t.id
      if (t.id === activeTerm()) path.classList.add("is-hot")
      svg.appendChild(path)
    })

    wrap.classList.toggle("has-hot", !!activeTerm())
  }

  function activeTerm() { return state.hot || state.selected }

  /* A target hidden at the selected width (the hamburger on desktop, the
     desktop nav row on mobile) has a zero-size rect. It gets no line — a line
     to nothing would be a false claim about where the part is. */
  function isRendered(rect) { return rect.width > 0.5 && rect.height > 0.5 }

  /* The desktop wireframe scrolls inside its own box on a narrow screen. A part
     scrolled out of view still has a real position, but a line to it would end
     at the clipped edge and read as pointing somewhere it does not — so the
     line is dropped until the part is scrolled back into the plate. */
  function anchorVisible(x, sb) { return x >= sb.left - 1 && x <= sb.right + 1 }

  /* -------------------------------------------------------- highlighting */
  function paintHighlights() {
    var active = activeTerm()
    var activeT = active ? termById[active] : null

    ;["labels-list", "rail-list"].forEach(function (id) {
      Array.prototype.forEach.call($(id).querySelectorAll("[data-term]"), function (b) {
        b.classList.toggle("is-hot", b.dataset.term === state.hot)
        b.classList.toggle("is-on", b.dataset.term === state.selected)
      })
    })

    var selT = state.selected ? termById[state.selected] : null
    Array.prototype.forEach.call($("figure-body").querySelectorAll("[data-target]"), function (n) {
      var isHot = !!activeT && n.dataset.target === activeT.target && activeT.plate === state.plate
      n.classList.toggle("is-hot", isHot)
      n.classList.toggle("is-on", !!selT && n.dataset.target === selT.target && selT.plate === state.plate)
      var mark = n.querySelector(":scope > .tmark")
      if (mark) mark.textContent = isHot ? String(activeT._n) : mark.dataset.default
    })

    Array.prototype.forEach.call($("leaders").children, function (p) {
      p.classList.toggle("is-hot", p.dataset.term === active)
    })
    $("connector").classList.toggle("has-hot", !!active)
  }

  function setHot(id) {
    if (state.hot === id) return
    state.hot = id
    paintHighlights()
    if (id) drawLeaders()
  }

  /* -------------------------------------------------------------- detail */
  function renderDetail() {
    var box = $("detail-body")
    var empty = $("detail-empty")
    if (!state.selected) { box.hidden = true; empty.hidden = false; return }
    empty.hidden = true
    box.hidden = false
    box.textContent = ""

    var t = termById[state.selected]
    var plate = plateById[t.plate]

    var top = el("div", "detail-top")
    top.appendChild(el("span", "detail-name", t.name))
    var tags = el("div", "detail-tags")
    tags.appendChild(el("span", "tag", catById[t.cat].label))
    tags.appendChild(el("span", "tag", plate.name))
    tags.appendChild(el("span", "tag tag-id", t.target))
    top.appendChild(tags)
    box.appendChild(top)

    box.appendChild(el("p", "detail-def", t.def))
    if (t.note) box.appendChild(el("p", "detail-note", t.note))

    var grid = el("div", "detail-grid")

    var srcBlock = el("div", "detail-block")
    srcBlock.appendChild(el("h3", null, "Lives in"))
    var srcUl = el("ul")
    t.src.forEach(function (s) {
      var li = el("li")
      li.appendChild(el("code", "src-item", s))
      srcUl.appendChild(li)
    })
    srcBlock.appendChild(srcUl)
    grid.appendChild(srcBlock)

    var aliasBlock = el("div", "detail-block")
    aliasBlock.appendChild(el("h3", null, "Accepted aliases"))
    if ((t.aliases || []).length) {
      var aUl = el("ul")
      t.aliases.forEach(function (a) {
        var li = el("li", "alias-item", a)
        aUl.appendChild(li)
      })
      aliasBlock.appendChild(aUl)
    } else {
      aliasBlock.appendChild(el("p", "alias-none", "None — use the canonical name."))
    }
    grid.appendChild(aliasBlock)

    if ((t.avoidAliases || []).length) {
      var badBlock = el("div", "detail-block")
      badBlock.appendChild(el("h3", null, "Do not call it"))
      var bUl = el("ul")
      t.avoidAliases.forEach(function (a) { bUl.appendChild(el("li", "alias-item", a)) })
      badBlock.appendChild(bUl)
      grid.appendChild(badBlock)
    }

    var routeBlock = el("div", "detail-block")
    routeBlock.appendChild(el("h3", null, "Route"))
    var rUl = el("ul")
    var rLi = el("li")
    rLi.appendChild(el("code", "src-item", plate.route))
    rUl.appendChild(rLi)
    routeBlock.appendChild(rUl)
    grid.appendChild(routeBlock)

    box.appendChild(grid)

    var eg = el("div", "prompt-eg")
    eg.appendChild(el("h3", null, "Use it in a prompt like this"))
    eg.appendChild(highlightName(t.prompt, t.name))
    box.appendChild(eg)
  }

  /* Mark the canonical name inside the example so the point lands visually. */
  function highlightName(sentence, name) {
    var p = el("p")
    var i = sentence.toLowerCase().indexOf(name.toLowerCase())
    if (i === -1) { p.textContent = sentence; return p }
    p.appendChild(document.createTextNode(sentence.slice(0, i)))
    p.appendChild(el("span", "hl", sentence.slice(i, i + name.length)))
    p.appendChild(document.createTextNode(sentence.slice(i + name.length)))
    return p
  }

  /* --------------------------------------------------------------- plate */
  function renderPlate() {
    var p = plateById[state.plate]
    $("plate-group").textContent = p.group
    $("plate-name").textContent = p.name
    $("plate-route").textContent = p.route
    $("plate-summary").textContent = p.summary
    var warn = $("plate-warning")
    if (p.warning) { warn.textContent = p.warning; warn.hidden = false } else { warn.hidden = true }

    var srcUl = $("plate-sources")
    srcUl.textContent = ""
    p.sources.forEach(function (s) { srcUl.appendChild(el("li", null, s)) })

    var widths = Object.keys(p.screenshots || {})
    var shotBtn = document.querySelector('.view-btn[data-view="screenshot"]')
    shotBtn.disabled = !widths.length
    shotBtn.title = widths.length ? "" : "No screenshot for this route — see the note under the wireframe."
    if (!widths.length && state.view === "screenshot") state.view = "wireframe"
    state.shotWidth = widths.indexOf("desktop") !== -1 ? "desktop" : widths[0] || null

    /* Provenance for the visual itself, stated on the plate. */
    var fn = $("figure-note")
    fn.textContent = ""
    if (widths.length) {
      fn.classList.remove("is-none")
      var stale = shotsAreStale()
      fn.classList.toggle("is-stale", stale)
      fn.appendChild(el("b", null, stale ? "Reference capture is stale" : "Reference capture available"))
      fn.appendChild(document.createTextNode(
        "A real screenshot of " + (p.screenshotRoute || p.route) + " backs this plate. Open the Screenshot view. " +
        (stale ? staleSentence() + " " : "") + (p.screenshotNote || "")
      ))
    } else {
      fn.classList.add("is-none")
      fn.appendChild(el("b", null, "No reference capture"))
      fn.appendChild(document.createTextNode(p.screenshotNote || ""))
    }

    $("figure-body").dataset.w = state.width
    renderFigure()
    renderLabels()
    renderView()
  }

  function renderView() {
    var p = plateById[state.plate]
    var isWire = state.view === "wireframe"
    $("connector").hidden = !isWire
    $("shotview").hidden = isWire

    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (b) {
      var on = b.dataset.view === state.view
      b.classList.toggle("is-on", on)
      b.setAttribute("aria-pressed", String(on))
    })

    if (isWire) {
      requestAnimationFrame(function () { drawLeaders(); paintHighlights() })
      return
    }

    var tabs = $("shot-tabs")
    tabs.textContent = ""
    Object.keys(p.screenshots).forEach(function (w) {
      var b = el("button", "chip")
      b.type = "button"
      b.textContent = w === "desktop" ? "Desktop · 1280" : "Mobile · 390"
      b.setAttribute("aria-pressed", String(w === state.shotWidth))
      b.addEventListener("click", function () { state.shotWidth = w; renderView() })
      tabs.appendChild(b)
    })

    var img = $("shot-img")
    img.src = "screenshots/" + p.screenshots[state.shotWidth]
    img.alt = "Screenshot of " + p.name + " at " + state.shotWidth + " width"

    var cap = $("shot-cap")
    cap.textContent = ""
    cap.appendChild(el("b", null, "Screenshot. A real capture, not a reconstruction."))
    var shot = SHOTS && SHOTS.shots.filter(function (s) {
      return s.file === p.screenshots[state.shotWidth]
    })[0]
    var line = shot
      ? "Captured " + SHOTS.capturedAt.slice(0, 10) + " at commit " + SHOTS.commit +
        " from " + shot.route + " (" + SHOTS.viewports[state.shotWidth].width + "×" +
        SHOTS.viewports[state.shotWidth].height + ", 2x)."
      : "Captured from " + (p.screenshotRoute || p.route) + "."
    cap.appendChild(document.createTextNode(line + " Connectors live on the wireframe, which stays correct when the UI moves."))
    if (shotsAreStale()) cap.appendChild(el("p", "shot-note", staleSentence()))
    if (p.screenshotNote) cap.appendChild(el("p", "shot-note", p.screenshotNote))
  }

  /* ------------------------------------------------------------ guidance */
  function renderGuidance() {
    var ul = $("avoid-list")
    var groups = [
      { kind: "qualify", label: "Qualify. Real word, more than one referent." },
      { kind: "avoid", label: "Avoid. Names nothing here." },
    ]
    groups.forEach(function (grp) {
    var head = el("li", "guide-sub", grp.label)
    ul.appendChild(head)
    G.avoid.filter(function (x) { return x.kind === grp.kind }).forEach(function (a) {
      var li = el("li")
      var term = el("p", "avoid-term", a.term)
      if (a.kind === "qualify") term.classList.add("is-qualify")
      /* Flag the ones that are also concepts in docs/GLOSSARY.md, so nobody
         reads "qualify" as "this word is wrong". */
      if (a.domain) term.appendChild(el("span", "domain-flag", "also a core concept"))
      li.appendChild(term)
      li.appendChild(el("p", "avoid-why", a.why))
      var use = el("div", "avoid-use")
      use.appendChild(el("span", "avoid-use-lb", "say"))
      a.instead.forEach(function (id) {
        var b = el("button", "use-btn")
        b.type = "button"
        b.textContent = termById[id].name
        b.addEventListener("click", function () { selectTerm(id, true) })
        use.appendChild(b)
      })
      li.appendChild(use)
      ul.appendChild(li)
    })
    })

    var gl = $("gap-list")
    G.gaps.forEach(function (g) {
      var li = el("li")
      li.appendChild(el("p", "gap-area", g.area))
      li.appendChild(el("p", "gap-detail", g.detail))
      li.appendChild(el("code", "gap-src", g.src))
      gl.appendChild(li)
    })
  }

  /* ------------------------------------------------------------- actions */
  function selectPlate(id) {
    if (state.plate === id) return
    state.plate = id
    state.selected = null
    state.hot = null
    syncPlateChips()
    renderPlate()
    renderRail()
    renderDetail()
  }

  function selectTerm(id, alsoSwitchPlate) {
    var t = termById[id]
    if (!t) return
    if (alsoSwitchPlate && t.plate !== state.plate) {
      state.plate = t.plate
      syncPlateChips()
      renderPlate()
    }
    state.selected = id
    state.hot = null
    if (state.view !== "wireframe" && t.plate === state.plate) {
      state.view = "wireframe"
      renderView()
    }
    renderRail()
    renderDetail()
    paintHighlights()
    drawLeaders()
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id)
  }

  /* --------------------------------------------------------------- wiring */
  function wire() {
    var q = $("q")
    q.addEventListener("input", function () {
      state.query = q.value.trim().toLowerCase()
      renderRail(); renderLabels(); paintHighlights(); drawLeaders()
    })
    $("q-clear").addEventListener("click", function () {
      q.value = ""; state.query = ""
      renderRail(); renderLabels(); paintHighlights(); drawLeaders(); q.focus()
    })

    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return
        state.view = b.dataset.view
        renderView()
      })
    })

    Array.prototype.forEach.call(document.querySelectorAll(".w-btn"), function (b) {
      b.addEventListener("click", function () {
        state.width = b.dataset.w
        $("figure-body").dataset.w = state.width
        Array.prototype.forEach.call(document.querySelectorAll(".w-btn"), function (o) {
          var on = o.dataset.w === state.width
          o.classList.toggle("is-on", on)
          o.setAttribute("aria-pressed", String(on))
        })
        requestAnimationFrame(function () { drawLeaders(); paintHighlights() })
      })
    })

    /* the desktop wireframe can scroll inside its own box — lines follow it */
    $("figure-scroll").addEventListener("scroll", drawLeaders, { passive: true })

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (document.activeElement === q && q.value) return
        state.selected = null; state.hot = null
        renderRail(); renderDetail(); paintHighlights(); drawLeaders()
      }
      /* "/" focuses search, the convention for a reference tool */
      if (e.key === "/" && document.activeElement !== q) {
        e.preventDefault(); q.focus(); q.select()
      }
    })

    /* Connectors are geometry, so they must re-solve whenever geometry moves. */
    var ro = window.ResizeObserver ? new ResizeObserver(drawLeaders) : null
    if (ro) { ro.observe($("connector")); ro.observe($("figure-body")) }
    window.addEventListener("resize", drawLeaders)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLeaders)
  }

  /* ----------------------------------------------------------------- boot */
  renderProvenance()
  renderFilters()
  renderGuidance()
  renderPlate()
  renderRail()
  renderDetail()
  wire()

  var fromHash = location.hash.slice(1)
  if (fromHash && termById[fromHash]) selectTerm(fromHash, true)
  else requestAnimationFrame(drawLeaders)
})()
