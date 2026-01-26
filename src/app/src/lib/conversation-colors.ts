import type { ConversationPriority, ConversationStatus } from "@/lib/server/conversation";

/**
 * Color mapping for conversation status
 */
export const statusColors: Record<ConversationStatus, { bg: string; text: string; border: string; label: string }> = {
  0: {
    // Pending
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-300 dark:border-yellow-700",
    label: "Pending",
  },
  1: {
    // Active
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-700",
    label: "Active",
  },
  2: {
    // Resolved
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-300 dark:border-green-700",
    label: "Resolved",
  },
  3: {
    // Closed
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-300 dark:border-gray-600",
    label: "Closed",
  },
};

/**
 * Color mapping for conversation priority
 */
export const priorityColors: Record<ConversationPriority, { bg: string; text: string; border: string; label: string }> =
  {
    0: {
      // Low
      bg: "bg-slate-100 dark:bg-slate-800/50",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-300 dark:border-slate-600",
      label: "Low",
    },
    1: {
      // Normal
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-300 dark:border-blue-600",
      label: "Normal",
    },
    2: {
      // High
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-300 dark:border-orange-600",
      label: "High",
    },
    3: {
      // Urgent
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-300 dark:border-red-600",
      label: "Urgent",
    },
  };

/**
 * Get Tailwind classes for a conversation status badge
 */
export function getStatusBadgeClasses(status: ConversationStatus): string {
  const colors = statusColors[status];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

/**
 * Get Tailwind classes for a conversation priority badge
 */
export function getPriorityBadgeClasses(priority: ConversationPriority): string {
  const colors = priorityColors[priority];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

/**
 * Get the status label
 */
export function getStatusLabel(status: ConversationStatus): string {
  return statusColors[status].label;
}

/**
 * Get the priority label
 */
export function getPriorityLabel(priority: ConversationPriority): string {
  return priorityColors[priority].label;
}

/**
 * Get indicator dot color for priority (for list items)
 */
export function getPriorityDotColor(priority: ConversationPriority): string {
  const dotColors: Record<ConversationPriority, string> = {
    0: "bg-slate-400",
    1: "bg-blue-500",
    2: "bg-orange-500",
    3: "bg-red-500",
  };
  return dotColors[priority];
}

/**
 * Get border color for conversation card based on priority
 */
export function getPriorityCardBorder(priority: ConversationPriority): string {
  const borders: Record<ConversationPriority, string> = {
    0: "border-l-slate-400",
    1: "border-l-blue-500",
    2: "border-l-orange-500",
    3: "border-l-red-500",
  };
  return borders[priority];
}

/**
 * Check if priority is high or urgent (needs attention)
 */
export function isHighPriority(priority: ConversationPriority): boolean {
  return priority >= 2;
}

/**
 * Check if conversation needs immediate attention
 */
export function needsAttention(status: ConversationStatus, priority: ConversationPriority): boolean {
  return status === 0 && priority >= 2; // Pending + High/Urgent
}
