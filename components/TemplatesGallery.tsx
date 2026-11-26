"use client"

import { useMemo, useState } from "react"
import { TemplateShowcaseCard } from "@/components/TemplateShowcaseCard"
import styles from "./TemplatesGallery.module.css"

export type TemplateCategory = {
  value: string
  label: string
}

export type GalleryTemplate = {
  id: string
  name: string
  category: string
  desc: string
  mood: string
  categoryLabel: string
  priceMyr: number | null
  livePreview: boolean
}

type TemplatesGalleryProps = {
  categories: TemplateCategory[]
  templates: GalleryTemplate[]
  initialCategory: string
  /** True when the active-template lookup failed server-side. */
  queryFailed: boolean
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}

export function TemplatesGallery({
  categories,
  templates,
  initialCategory,
  queryFailed,
}: TemplatesGalleryProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [search, setSearch] = useState("")
  const query = normalizeQuery(search)

  // One derived list: the search and the category pill apply together, and
  // only matching cards render.
  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const matchesCategory =
          activeCategory === "all" || template.category === activeCategory
        if (!matchesCategory) return false
        if (!query) return true
        const haystack =
          `${template.name} ${template.mood} ${template.desc}`.toLowerCase()
        return haystack.includes(query)
      }),
    [templates, activeCategory, query],
  )

  if (queryFailed) {
    // A failed active-template lookup must never look like an empty catalogue,
    // so it replaces every control and list.
    return (
      <div className={styles.galleryShell}>
        <div className={styles.statePanel} role="status">
          <p className={styles.stateTitle}>Reka bentuk tidak dapat dimuatkan</p>
          <p className={styles.stateCopy}>
            Maaf, berlaku gangguan semasa memuatkan koleksi template. Sila cuba lagi.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.galleryShell}>
      <div className={styles.searchField}>
        <label className={styles.searchLabel} htmlFor="template-search">
          Cari
        </label>
        <input
          id="template-search"
          type="search"
          className={styles.searchInput}
          placeholder="Cari nama, mood, atau penerangan…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className={styles.filterMeta}>
        <div className={styles.filterScroller} aria-label="Tapis mengikut kategori">
          {categories.map((category) => {
            const isActive = activeCategory === category.value
            return (
              <button
                key={category.value}
                type="button"
                className={styles.filterPill}
                aria-pressed={isActive}
                data-active={isActive}
                onClick={() => setActiveCategory(category.value)}
              >
                {category.label}
              </button>
            )
          })}
        </div>
        <p className={styles.count} aria-live="polite">
          {visibleTemplates.length} reka bentuk
        </p>
      </div>

      {visibleTemplates.length === 0 ? (
        <div className={styles.statePanel}>
          <p className={styles.stateTitle}>Tiada reka bentuk sepadan</p>
          <p className={styles.stateCopy}>
            Cuba kata kunci lain, atau kosongkan carian dan tapisan anda.
          </p>
          <div className={styles.stateActions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => setSearch("")}
            >
              Kosongkan carian
            </button>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => setActiveCategory("all")}
            >
              Papar semua kategori
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleTemplates.map((template, index) => (
            <div key={template.id} className={styles.gridCell}>
              <TemplateShowcaseCard
                id={template.id}
                name={template.name}
                mood={template.mood}
                categoryLabel={template.categoryLabel}
                priceMyr={template.priceMyr}
                livePreview={template.livePreview}
                eager={index < 4}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
