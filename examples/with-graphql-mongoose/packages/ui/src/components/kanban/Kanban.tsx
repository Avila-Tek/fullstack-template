'use client';

import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from '@hello-pangea/dnd';
import React from 'react';

interface KanbanProps {
  children: React.ReactNode;
  className?: string;
  onDragEnd: (result: DropResult) => void;
  // any props that come into the component
}
interface DraggableProps {
  children: React.ReactNode;
  key: string;
  draggableId: string;
  index: number;
  // any props that come into the component
}
interface DroppableProps {
  children: React.ReactNode;
  key: string;
  droppableId: string;
  horizontal?: boolean;
  className?: string;
  // any props that come into the component
}
export default function Kanban({
  children,
  className,
  onDragEnd,
  ...props
}: KanbanProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`${className} w-full h-full overflow-auto`}>
        {children}
      </div>
    </DragDropContext>
  );
}

const DroppableArea = ({
  children,
  className,
  horizontal,
  ...props
}: DroppableProps) => (
  <Droppable direction={horizontal ? 'horizontal' : 'vertical'} {...props}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={`${className}`}
      >
        {children}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);

const DraggableItem = ({ children, ...props }: DraggableProps) => (
  <Draggable {...props}>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        {children}
      </div>
    )}
  </Draggable>
);

Kanban.DroppableArea = DroppableArea;
Kanban.DraggableItem = DraggableItem;

export type { DropResult };
