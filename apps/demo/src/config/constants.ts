// Configuration constants
export const ROW_COUNT = 100_000;
export const COL_COUNT = 20;
export const ROW_HEIGHT = 32;

// Data generation constants
export const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
export const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
export const priorities = ['Low', 'Medium', 'High', 'Critical'];
export const categories = ['Category A', 'Category B', 'Category C', 'Category D'];
export const tagOptions = ['Frontend', 'Backend', 'DevOps', 'Design', 'QA', 'Mobile'];

// Operation modes
export let dataMode: 'frontend' | 'backend' | 'auto' = 'frontend';

// Loading template state
export let loadingTemplate: 'simple' | 'animated' | 'modern' | 'skeleton' | 'overlay' = 'modern';
