<script setup lang="ts">
import { ref, computed, watch, PropType } from "vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-vue-next";

// Interface cho dữ liệu đầu vào từ backend (đã làm phẳng)
export interface UserFlatDataRow {
  id: string; // BẮT BUỘC: Backend cần cung cấp ID duy nhất cho mỗi hàng
  level: number;
  // Các trường dữ liệu động
  [key: string]: any;
  // Backend có thể cung cấp isParent và isExpanded ban đầu
  isParent?: boolean;
  isExpanded?: boolean;
}

// Interface cho định nghĩa cột từ props
export interface UserColumnDefinition {
  column: string; // Tên trường dữ liệu (key)
  type: "dimension" | "metric";
  label?: string; // Nhãn hiển thị cho cột (tùy chọn, nếu không có sẽ tự tạo)
  headerClass?: string;
  cellClass?: string;
  contentClass?: string;
  minWidth?: string;
  format?: (value: any, row: UserFlatDataRow) => string | number;
}

// Interface nội bộ cho cột đã được xử lý (thêm label nếu thiếu)
interface InternalColumnDef {
  key: string;
  type: "dimension" | "metric";
  label: string;
  headerClass?: string;
  cellClass?: string;
  contentClass?: string;
  minWidth?: string;
  format?: (value: any, row: UserFlatDataRow) => string | number;
}

const props = defineProps({
  data: {
    type: Array as PropType<UserFlatDataRow[]>,
    required: true,
    default: () => [],
  },
  columns: {
    type: Array as PropType<UserColumnDefinition[]>,
    required: true,
    validator: (value: UserColumnDefinition[]) => value.length > 0,
  },
  defaultExpandAll: {
    type: Boolean,
    default: true,
  },
  indentationSize: {
    type: Number,
    default: 24,
  },
  summaryValue: {
    type: String,
    default: "__summary__",
  },
  summaryCellClass: {
    type: String,
    default: "bg-slate-50 dark:bg-slate-800 font-semibold",
  },
});

// Xử lý props.columns thành định dạng nội bộ (ví dụ: tạo label nếu thiếu)
const internalColumns = computed<InternalColumnDef[]>(() => {
  return props.columns.map((col) => ({
    ...col,
    key: col.column, // Đảm bảo key là 'column' từ input
    label:
      col.label ||
      col.column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), // Tự tạo label
  }));
});

// Lấy ra danh sách các dimension key theo thứ tự
const dimensionKeys = computed(() =>
  props.columns
    .filter((col) => col.type === "dimension")
    .map((col) => col.column)
);

// Trạng thái nội bộ của các hàng, bao gồm trạng thái mở rộng/thu gọn
const interactiveRows = ref<UserFlatDataRow[]>([]);

watch(
  () => props.data,
  (newData) => {
    interactiveRows.value = newData.map((row, index) => {
      // Xác định isParent: dựa vào __summary__ ở dimension tiếp theo hoặc nếu có hàng con trực tiếp
      let calculatedIsParent = row.isParent;
      if (calculatedIsParent === undefined) {
        const currentDimensionIndex = row.level - 1; // campaign_name là dim 0 (level 1), adset_name là dim 1 (level 2)
        const nextDimensionKey = dimensionKeys.value[currentDimensionIndex + 1];
        if (nextDimensionKey && row[nextDimensionKey] === props.summaryValue) {
          calculatedIsParent = true;
        } else if (row.level < dimensionKeys.value.length) {
          // Vẫn còn dimension con có thể có
          // Kiểm tra xem có hàng nào ngay sau nó có level lớn hơn không
          // Điều này phức tạp hơn nếu không có __summary__ và cần kiểm tra thực sự
          // Dựa vào ví dụ data: level 1 có adset_name === '__summary__' là parent
          if (
            row.level === 1 &&
            row[dimensionKeys.value[1]] === props.summaryValue
          ) {
            calculatedIsParent = true;
          } else {
            calculatedIsParent = false; // Mặc định không phải parent nếu không có dấu hiệu rõ ràng
          }
        } else {
          calculatedIsParent = false;
        }
      }

      return {
        ...row,
        id: `row-${index}`, // Đảm bảo có ID, backend nên cung cấp
        isParent: calculatedIsParent,
        isExpanded:
          row.isExpanded !== undefined
            ? row.isExpanded
            : calculatedIsParent
            ? props.defaultExpandAll
            : undefined,
      };
    });
  },
  { immediate: true, deep: true }
);

const rowsToDisplay = computed(() => {
  if (!interactiveRows.value.some((row) => row.isParent)) {
    return interactiveRows.value;
  }
  const result: UserFlatDataRow[] = [];
  const parentExpansionStack: boolean[] = [];

  for (const row of interactiveRows.value) {
    if (row.level - 1 < parentExpansionStack.length) {
      // level trong data là 1-based
      parentExpansionStack.length = row.level - 1;
    }
    if (
      row.level === 1 ||
      (row.level > 1 && parentExpansionStack[row.level - 2])
    ) {
      // stack index là 0-based
      result.push(row);
      if (row.isParent) {
        parentExpansionStack[row.level - 1] = !!row.isExpanded;
      }
    }
  }
  return result;
});

function toggleExpand(rowId: string) {
  const targetRow = interactiveRows.value.find((r) => r.id === rowId);
  if (targetRow && targetRow.isParent) {
    targetRow.isExpanded = !targetRow.isExpanded;
  }
}

function getCellValue(row: UserFlatDataRow, column: InternalColumnDef) {
  const value = row[column.key];
  return column.format ? column.format(value, row) : value;
}

function isSummaryCell(value: any): boolean {
  return value === props.summaryValue;
}

function displayCellContent(row: any, column: InternalColumnDef): any {
  let value = row[column.key];

  if (value === null || value === undefined) return ""; // Hiển thị trống nếu là null/undefined
  return isSummaryCell(value) ? "All" : getCellValue(row, column);
}
</script>

<template>
  <Table v-if="internalColumns.length > 0 && rowsToDisplay.length > 0">
    <TableHeader>
      <TableRow>
        <TableHead
          v-for="(column, colIndex) in internalColumns"
          :key="column.key"
          :class="[
            column.headerClass,
            column.contentClass, // Áp dụng contentClass cho header để căn lề text nếu cần
            colIndex === 0
              ? column.minWidth || 'min-w-[300px]'
              : column.minWidth,
          ]"
          :style="{
            minWidth:
              colIndex === 0 ? column.minWidth || '300px' : column.minWidth,
            position: colIndex === 0 ? 'sticky' : undefined,
            left: colIndex === 0 ? '0' : undefined,
            zIndex: colIndex === 0 ? 20 : undefined,
            backgroundColor:
              colIndex === 0 ? 'var(--table-header-bg, white)' : undefined,
          }"
          class="dark:!bg-slate-900"
        >
          {{ column.label }}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="row in rowsToDisplay" :key="row.id">
        <TableRow
          :class="{
            'bg-slate-100 dark:bg-slate-800/50':
              isSummaryCell(row[dimensionKeys[row.level - 1]]) &&
              row.level > 0 &&
              dimensionKeys[row.level] &&
              row[dimensionKeys[row.level]] === summaryValue,
          }"
        >
          <TableCell
            v-for="(column, colIndex) in internalColumns"
            :key="column.key"
            :class="[
              column.cellClass,
              isSummaryCell(row[column.key])
                ? props.summaryCellClass
                : 'bg-white dark:bg-slate-900',
              colIndex === 0 ? 'sticky left-0 z-10 font-medium' : '',
              column.contentClass, // Áp dụng contentClass cho cell
            ]"
            :style="{
              position: colIndex === 0 ? 'sticky' : undefined,
              left: colIndex === 0 ? '0' : undefined,
              backgroundColor:
                colIndex === 0
                  ? isSummaryCell(row[column.key])
                    ? undefined
                    : 'var(--table-cell-bg, white)'
                  : undefined,
            }"
            class="dark:!bg-slate-900"
          >
            <div
              v-if="colIndex === 0"
              class="flex items-center"
              :style="{
                paddingLeft: `${(row.level - 1) * props.indentationSize}px`,
              }"
            >
              <button
                v-if="row.isParent"
                @click="toggleExpand(row.id)"
                class="mr-2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                aria-label="Toggle expand"
              >
                <ChevronDownIcon
                  v-if="row.isExpanded"
                  class="w-4 h-4 cursor-pointer"
                />
                <ChevronRightIcon v-else class="w-4 h-4 cursor-pointer" />
              </button>
              <span
                v-else-if="row.level > 1"
                class="inline-block flex-shrink-0"
                :style="{ width: '1.25rem', marginRight: '0.5rem' }"
              ></span>
              <span>{{ displayCellContent(row, column) }}</span>
            </div>
            <span v-else>{{ displayCellContent(row, column) }}</span>
          </TableCell>
        </TableRow>
      </template>
    </TableBody>
  </Table>
  <div
    v-else-if="internalColumns.length === 0"
    class="p-4 text-center text-red-500"
  >
    Vui lòng cung cấp định nghĩa cột (columns prop).
  </div>
  <div v-else class="p-4 text-center text-gray-500 dark:text-gray-400">
    Không có dữ liệu để hiển thị.
  </div>
</template>

<style scoped>
:root {
  --table-header-bg: white;
  --table-cell-bg: white;
}

.sticky.left-0 {
  position: -webkit-sticky;
  position: sticky;
  left: 0;
}
/* Bỏ ::after để tránh lỗi theme(), bạn có thể thêm border bằng cách khác nếu muốn */
</style>
