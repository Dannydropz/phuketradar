# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Category Dropdown**: Fixed an issue where articles with capitalized categories in the database (e.g., "Crime", "Traffic") were not being displayed in the frontend dropdown due to case-sensitive mapping. Updated `shared/category-map.ts` to include these variants.
