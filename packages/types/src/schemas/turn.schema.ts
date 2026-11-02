/**
 * Turn Schema - «Etter tur» (next in line) chores, ST-2075
 *
 * One child has the turn at a time. The open turn is one pending assignment; finishing it
 * (the normal tick in the app, or a scan of the chore's QR code / NFC sticker) gives the
 * points and moves the turn to the next child in the parent's order.
 */
import { z } from '../generators/openapi.generator.js';

/** A child in the chore's order */
export const TurnChildSchema = z.object({
  childId: z.string().uuid(),
  name: z.string(),
});

export type TurnChild = z.infer<typeof TurnChildSchema>;

/** An «Etter tur» chore with whose turn it is */
export const TaskTurnSchema = z.object({
  taskId: z.string().uuid(),
  name: z.string(),
  points: z.number().int().min(0),
  /** The open turn's assignment, the one the normal tick completes */
  assignmentId: z.string().uuid().nullable(),
  /** The children in turn order (children that no longer exist are left out) */
  order: z.array(TurnChildSchema),
  turnChildId: z.string().uuid().nullable(),
  /** Code in the link https://home.st44.no/s/<code>; only sent to parents */
  scanCode: z.string().nullable(),
});

export type TaskTurn = z.infer<typeof TaskTurnSchema>;

export const TaskTurnsResponseSchema = z.object({
  turns: z.array(TaskTurnSchema),
});

export type TaskTurnsResponse = z.infer<typeof TaskTurnsResponseSchema>;

/** How a turn ended: ticked in the app, scanned, or moved by a parent */
export const TurnEventKindSchema = z.enum(['app', 'scan', 'moved']);

export type TurnEventKind = z.infer<typeof TurnEventKindSchema>;

/** One line in the parent's history, newest first */
export const TurnHistoryEntrySchema = z.object({
  kind: TurnEventKindSchema,
  /** Who did it, or whose turn was moved away */
  childId: z.string().uuid().nullable(),
  childName: z.string().nullable(),
  at: z.string().datetime(),
  points: z.number().int().min(0),
  /** Parent who moved the turn (kind 'moved') */
  movedByName: z.string().nullable(),
});

export type TurnHistoryEntry = z.infer<typeof TurnHistoryEntrySchema>;

export const TurnHistoryResponseSchema = z.object({
  history: z.array(TurnHistoryEntrySchema),
});

export type TurnHistoryResponse = z.infer<typeof TurnHistoryResponseSchema>;

export const MoveTurnRequestSchema = z.object({
  childId: z.string().uuid(),
});

export type MoveTurnRequest = z.infer<typeof MoveTurnRequestSchema>;

/** What the scan page can show before sign-in: the chore's name only */
export const ScanCodeInfoSchema = z.object({
  taskName: z.string(),
});

export type ScanCodeInfo = z.infer<typeof ScanCodeInfoSchema>;

/** The answer to a scan by a signed-in child */
export const ScanResultSchema = z.discriminatedUnion('result', [
  z.object({
    result: z.literal('done'),
    taskId: z.string().uuid(),
    taskName: z.string(),
    assignmentId: z.string().uuid(),
    pointsEarned: z.number().int().min(0),
    completedAt: z.string(),
    nextChildName: z.string().nullable(),
  }),
  z.object({
    result: z.literal('not_your_turn'),
    taskId: z.string().uuid(),
    taskName: z.string(),
    points: z.number().int().min(0),
    turnChildName: z.string().nullable(),
    /** The scanning child is the next in the order after the one whose turn it is */
    youAreNext: z.boolean(),
  }),
  /** A grown-up scanned: only the child whose turn it is finishes the chore with the code */
  z.object({
    result: z.literal('parent'),
    taskId: z.string().uuid(),
    taskName: z.string(),
    points: z.number().int().min(0),
    turnChildName: z.string().nullable(),
  }),
]);

export type ScanResult = z.infer<typeof ScanResultSchema>;

/** The signed-in child's view: the same turns, and which child they are */
export const MyTurnsResponseSchema = TaskTurnsResponseSchema.extend({
  myChildId: z.string().uuid(),
});

export type MyTurnsResponse = z.infer<typeof MyTurnsResponseSchema>;
