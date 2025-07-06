<script setup lang="ts">
import { ref, computed, watch, PropType, toRaw } from "vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Đảm bảo đường dẫn chính xác
import { ChevronRightIcon, ChevronDownIcon } from "lucide-vue-next"; // Hoặc icon bạn chọn

// Interface cho một hàng dữ liệu đầu vào (có thể chứa children)
export interface HierarchicalDataRowInput {
  id: string;
  [key: string]: any; // Cho phép các trường dữ liệu tùy ý
  children?: HierarchicalDataRowInput[];
  isExpanded?: boolean; // Trạng thái mở rộng ban đầu (tùy chọn)
}

// Interface cho một hàng đã được xử lý nội bộ (thêm level, isParent, v.v.)
export interface ProcessedHierarchicalRow extends HierarchicalDataRowInput {
  level: number;
  isParent: boolean;
  // isExpanded đã có trong HierarchicalDataRowInput nếu được cung cấp, nếu không sẽ được khởi tạo
  // isVisible sẽ được xác định động khi tạo displayRows
  parentId: string | null;
}

// Interface cho định nghĩa cột
export interface ColumnDefinition {
  key: string; // Key trong đối tượng HierarchicalDataRowInput
  label: string; // Nhãn cho tiêu đề bảng
  headerClass?: string; // Class tùy chọn cho TH
  cellClass?: string; // Class tùy chọn cho TD (cho cả ô)
  contentClass?: string; // Class tùy chọn cho nội dung bên trong TD (ví dụ: text-right)
  minWidth?: string; // Chiều rộng tối thiểu cho cột
  format?: (value: any, row: HierarchicalDataRowInput) => string | number; // Hàm định dạng giá trị ô
  // renderCell?: (row: HierarchicalDataRowInput, h: Function) => VNode; // Nâng cao: tự render ô (ít dùng với <script setup>)
}

const props = defineProps({
  rawData: {
    type: Array as PropType<HierarchicalDataRowInput[]>,
    required: true,
    default: () => [],
  },
  // Các cột này KHÔNG bao gồm cột phân cấp đầu tiên
  columns: {
    type: Array as PropType<ColumnDefinition[]>,
    required: true,
    default: () => [],
  },
  // Key của trường dữ liệu sẽ hiển thị trong cột phân cấp đầu tiên
  hierarchicalColumnKey: {
    type: String,
    required: true,
  },
  // Nhãn cho tiêu đề cột phân cấp đầu tiên
  hierarchicalColumnLabel: {
    type: String,
    default: "Name",
  },
  // Mặc định mở rộng tất cả các cấp cha hay không
  defaultExpandAll: {
    type: Boolean,
    default: false,
  },
  // Kích thước thụt lề cho mỗi cấp (px)
  indentationSize: {
    type: Number,
    default: 24, // Tăng kích thước thụt lề
  },
});

// Trạng thái nội bộ đã được xử lý (thêm level, isParent, isExpanded)
const processedInternalData = ref<ProcessedHierarchicalRow[]>([]);

// Hàm khởi tạo/cập nhật dữ liệu nội bộ từ props.rawData
function initializeAndProcessData(
  nodes: HierarchicalDataRowInput[],
  level = 0,
  parentId: string | null = null
): ProcessedHierarchicalRow[] {
  return nodes.map((node) => {
    const isParentNode = !!(node.children && node.children.length > 0);
    const processedNode: ProcessedHierarchicalRow = {
      ...node, // Giữ lại các trường gốc, bao gồm cả isExpanded nếu có từ đầu
      level,
      isParent: isParentNode,
      parentId,
      // Nếu isExpanded không được định nghĩa sẵn, dùng defaultExpandAll cho parent, undefined cho child
      isExpanded:
        node.isExpanded !== undefined
          ? node.isExpanded
          : isParentNode
          ? props.defaultExpandAll
          : undefined,
      children: node.children
        ? initializeAndProcessData(node.children, level + 1, node.id)
        : undefined,
    };
    return processedNode;
  });
}

// Theo dõi sự thay đổi của rawData từ props để xử lý lại
watch(
  () => props.rawData,
  (newData) => {
    processedInternalData.value = initializeAndProcessData(toRaw(newData)); // Sử dụng toRaw để tránh proxy lồng nhau phức tạp
  },
  { immediate: true, deep: true }
);

// Hàm làm phẳng cây và lọc dựa trên trạng thái isExpanded
function flattenForDisplay(
  nodes: ProcessedHierarchicalRow[]
): ProcessedHierarchicalRow[] {
  let flatList: ProcessedHierarchicalRow[] = [];
  for (const node of nodes) {
    flatList.push(node); // Thêm node cha vào danh sách
    // Nếu node cha là parent, được mở rộng và có children, thì đệ quy thêm children
    if (node.isParent && node.isExpanded && node.children) {
      flatList = flatList.concat(
        flattenForDisplay(node.children as ProcessedHierarchicalRow[])
      );
    }
  }
  return flatList;
}

// Danh sách các hàng sẽ được hiển thị trên bảng
const displayRows = computed(() => {
  return flattenForDisplay(processedInternalData.value);
});

// Hàm xử lý mở rộng/thu gọn
function toggleExpand(rowId: string) {
  function findAndToggle(nodes: ProcessedHierarchicalRow[]): boolean {
    for (const node of nodes) {
      if (node.id === rowId && node.isParent) {
        node.isExpanded = !node.isExpanded;
        return true; // Đã tìm thấy và thay đổi
      }
      if (
        node.children &&
        findAndToggle(node.children as ProcessedHierarchicalRow[])
      ) {
        return true; // Tìm thấy trong children
      }
    }
    return false; // Không tìm thấy
  }

  // Cập nhật trạng thái trong processedInternalData.value
  // Vue 3 sẽ tự động phát hiện thay đổi sâu trong ref nếu các đối tượng là reactive.
  // Tuy nhiên, vì initializeAndProcessData tạo object mới, việc mutate trực tiếp isExpanded là ổn.
  findAndToggle(processedInternalData.value);

  // Để chắc chắn computed displayRows cập nhật, có thể cần "đá" reactivity một chút nếu Vue không tự bắt được
  // processedInternalData.value = [...processedInternalData.value]; // Dòng này thường không cần thiết với Vue 3 ref và object mutation.
}

// Hàm lấy giá trị ô, áp dụng format nếu có
function getCellValue(row: HierarchicalDataRowInput, column: ColumnDefinition) {
  const value = row[column.key];
  return column.format ? column.format(value, row) : value;
}
</script>

<template>
  <Table v-if="displayRows.length > 0">
    <TableHeader>
      <TableRow>
        <TableHead
          :class="[
            'sticky left-0 z-20 bg-white dark:bg-slate-900',
            hierarchicalColumnLabel === 'Campaign name'
              ? 'min-w-[300px]'
              : 'min-w-[250px]',
            props.columns[0]?.headerClass,
          ]"
          :style="{
            minWidth:
              props.columns[0]?.minWidth ||
              (hierarchicalColumnLabel === 'Campaign name' ? '300px' : '250px'),
          }"
        >
          {{ hierarchicalColumnLabel }}
        </TableHead>
        <TableHead
          v-for="column in columns"
          :key="column.key"
          :class="[column.headerClass, column.contentClass]"
          :style="{ minWidth: column.minWidth }"
        >
          {{ column.label }}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="row in displayRows" :key="row.id">
        <TableRow>
          <TableCell
            :class="[
              'sticky left-0 z-10 bg-white dark:bg-slate-900 font-medium',
              props.columns[0]?.cellClass,
            ]"
          >
            <div
              class="flex items-center"
              :style="{ paddingLeft: `${row.level * indentationSize}px` }"
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
                v-else-if="row.level > 0"
                class="inline-block flex-shrink-0"
                :style="{ width: '1.25rem', marginRight: '0.5rem' }"
              ></span>
              <span>{{ row[hierarchicalColumnKey] }}</span>
            </div>
          </TableCell>
          <TableCell
            v-for="column in columns"
            :key="column.key"
            :class="[column.cellClass, column.contentClass]"
          >
            <span v-if="column.key in row">{{
              getCellValue(row, column)
            }}</span>
            <span v-else></span>
          </TableCell>
        </TableRow>
      </template>
    </TableBody>
  </Table>
  <div v-else class="p-4 text-center text-gray-500">
    Không có dữ liệu để hiển thị.
  </div>
</template>

<style scoped>
/* Đảm bảo cột sticky hoạt động tốt và có nền che phủ khi cuộn */
.sticky.left-0 {
  position: -webkit-sticky; /* Safari */
  position: sticky;
  left: 0;
  /* z-index đã được thêm bằng class Tailwind (z-10, z-20) */
  /* Màu nền cũng được thêm bằng class Tailwind (bg-white, dark:bg-slate-900) */
}

/* Thêm border mờ cho cột sticky để phân biệt rõ hơn khi cuộn (tùy chọn) */
.sticky.left-0::after {
  content: "";
  position: absolute;
  top: 0;
  right: -1px; /* Đặt bên ngoài để không che mất nội dung */
  bottom: 0;
  width: 1px;
  /* background-color: theme("colors.gray.200"); Sử dụng theme của Tailwind */
}

.dark .sticky.left-0::after {
  /* background-color: theme("colors.slate.700"); */
}

/* Cần đảm bảo TableHeader cũng có z-index cao hơn TableBody nếu TH cũng sticky */
/* Trong ví dụ này, chỉ TableCell đầu tiên là sticky */
</style>
