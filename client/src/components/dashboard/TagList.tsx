import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { SelectTag } from "@db/schema";

interface TagListProps {
  entryId: number;
  onTagSelect: (tagId: number) => void;
}

export default function TagList({ entryId, onTagSelect }: TagListProps) {
  const [newTagName, setNewTagName] = useState("");
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery<SelectTag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: entryTags = [] } = useQuery<SelectTag[]>({
    queryKey: ["/api/entries", entryId, "tags"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setNewTagName("");
    },
  });

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await createTagMutation.mutateAsync(newTagName.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateTag} className="flex gap-2">
        <Input
          placeholder="New tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
        <Button type="submit" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant={entryTags.some(t => t.id === tag.id) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onTagSelect(tag.id)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
