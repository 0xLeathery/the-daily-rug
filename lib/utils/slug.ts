export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, '-')    // replace spaces/underscores with hyphens
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '')      // trim leading/trailing hyphens
    .slice(0, 80)               // limit length
}
