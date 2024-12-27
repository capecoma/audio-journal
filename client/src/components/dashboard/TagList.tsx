import { Badge } from "@/components/ui/badge";

interface TagListProps {
  tags: string[];
}

export default function TagList({ tags }: TagListProps) {
  if (!tags.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="px-2.5 py-1 text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}