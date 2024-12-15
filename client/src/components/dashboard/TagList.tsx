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
    <div className="flex flex-wrap gap-2">
      {entryTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="default"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
