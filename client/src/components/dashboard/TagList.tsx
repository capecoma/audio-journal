import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SelectTag } from "@db/schema";

interface TagListProps {
  entryId: number;
  entryTags: SelectTag[];
  onTagSelect: (tagId: number) => void;
}

export default function TagList({ entryId, entryTags, onTagSelect }: TagListProps) {
  const [newTagName, setNewTagName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [], isLoading: isLoadingTags } = useQuery<SelectTag[]>({
    queryKey: ["/api/tags"],
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
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await createTagMutation.mutateAsync(newTagName.trim());
  };

  if (isLoadingTags) {
    return <div>Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateTag} className="flex gap-2">
        <Input
          placeholder="New tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={createTagMutation.isPending}>
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
