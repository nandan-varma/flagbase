import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KeyboardSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import type { TargetingRule, Condition } from '../../api/client'
import { clsx } from 'clsx'

const OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'isNot', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'inList', label: 'in list' },
  { value: 'semverGte', label: 'semver ≥' },
  { value: 'percentile', label: 'percentile <' },
] as const

const COMMON_ATTRIBUTES = ['userId', 'email', 'plan', 'country', 'version']

function newRule(): TargetingRule {
  return {
    id: crypto.randomUUID(),
    name: 'New rule',
    conditions: [],
    serveValue: 'true',
    rolloutPercentage: 100,
  }
}

function newCondition(): Condition {
  return { attribute: 'userId', operator: 'is', value: '' }
}

interface RuleCardProps {
  rule: TargetingRule
  flagType: string
  onChange: (rule: TargetingRule) => void
  onRemove: () => void
}

function RuleCard({ rule, flagType, onChange, onRemove }: RuleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function updateCondition(idx: number, partial: Partial<Condition>) {
    const conditions = rule.conditions.map((c, i) => i === idx ? { ...c, ...partial } : c)
    onChange({ ...rule, conditions })
  }

  function addCondition() {
    onChange({ ...rule, conditions: [...rule.conditions, newCondition()] })
  }

  function removeCondition(idx: number) {
    onChange({ ...rule, conditions: rule.conditions.filter((_, i) => i !== idx) })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white border border-gray-200 rounded-xl p-4 space-y-3',
        isDragging && 'shadow-lg opacity-80'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <input
          value={rule.name}
          onChange={e => onChange({ ...rule, name: e.target.value })}
          className="flex-1 text-sm font-medium border-none outline-none focus:ring-0 bg-transparent"
          placeholder="Rule name"
        />
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 pl-7">
        {rule.conditions.map((cond, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            <select
              value={cond.attribute}
              onChange={e => updateCondition(idx, { attribute: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {COMMON_ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
              {!COMMON_ATTRIBUTES.includes(cond.attribute) && (
                <option value={cond.attribute}>{cond.attribute}</option>
              )}
            </select>
            <select
              value={cond.operator}
              onChange={e => updateCondition(idx, { operator: e.target.value as Condition['operator'] })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            <input
              value={Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}
              onChange={e => {
                const raw = e.target.value
                const val = cond.operator === 'inList' ? raw.split(',').map(s => s.trim()) : raw
                updateCondition(idx, { value: val })
              }}
              placeholder={cond.operator === 'inList' ? 'val1, val2, ...' : 'value'}
              className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button onClick={() => removeCondition(idx)} className="text-gray-400 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addCondition}
          className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add condition
        </button>
      </div>

      <div className="pl-7 flex items-center gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Serve value</label>
          {flagType === 'boolean' ? (
            <select
              value={rule.serveValue}
              onChange={e => onChange({ ...rule, serveValue: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              value={rule.serveValue}
              onChange={e => onChange({ ...rule, serveValue: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Rollout</label>
          <input
            type="number"
            min={0}
            max={100}
            value={rule.rolloutPercentage}
            onChange={e => onChange({ ...rule, rolloutPercentage: Number(e.target.value) })}
            className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  rules: TargetingRule[]
  flagType: string
  onChange: (rules: TargetingRule[]) => void
  onSave: () => void
  saving?: boolean
}

export function TargetingRules({ rules, flagType, onChange, onSave, saving = false }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex(r => r.id === active.id)
      const newIndex = rules.findIndex(r => r.id === over.id)
      onChange(arrayMove(rules, oldIndex, newIndex))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Targeting rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">Rules are evaluated top-to-bottom — first match wins</p>
        </div>
        <button
          onClick={() => onChange([...rules, newRule()])}
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <Plus className="h-4 w-4" /> Add rule
        </button>
      </div>

      {rules.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  flagType={flagType}
                  onChange={updated => onChange(rules.map((r, i) => i === idx ? updated : r))}
                  onRemove={() => onChange(rules.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
          No targeting rules. All users get the rollout percentage.
        </p>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="mt-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
