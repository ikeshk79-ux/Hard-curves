import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

const Row = ({ ex, index, dayIndex, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-testid={`day-${dayIndex}-exercise-${index}`}
      className={`flex items-center gap-2 rounded-xl border bg-hc-card p-2 ${isDragging ? "z-10 border-hc-lime shadow-xl" : "border-hc-line"}`}>
      <button type="button" data-testid={`day-${dayIndex}-exercise-handle-${index}`} {...attributes} {...listeners}
        className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center text-hc-muted active:cursor-grabbing" aria-label={`Drag ${ex.name}`}>
        <GripVertical className="h-5 w-5" />
      </button>
      <img src={ex.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{ex.name}</div>
        <div className="text-xs text-hc-muted">{ex.muscle} · {ex.sets} × {ex.reps}</div>
      </div>
      <button type="button" data-testid={`day-${dayIndex}-exercise-remove-${index}`} onClick={onRemove} className="grid h-10 w-10 shrink-0 place-items-center text-hc-muted hover:text-red-400" aria-label={`Remove ${ex.name}`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const SortableExerciseList = ({ ids, exMap, dayIndex, onChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) onChange(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };
  const items = ids.filter((id) => exMap[id]);
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((id, i) => <Row key={id} ex={exMap[id]} index={i} dayIndex={dayIndex} onRemove={() => onChange(ids.filter((x) => x !== id))} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
};
