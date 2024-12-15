import { Badge } from "@/components/ui/badge";
import type { SelectTag } from "@db/schema";

interface TagListProps {
  entryTags: SelectTag[];
}

export default function TagList({ entryTags }: TagListProps) {
  if (!entryTags.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entryTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="px-2.5 py-1 text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
