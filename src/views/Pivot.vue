<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Điều chỉnh đường dẫn tới component HierarchicalTable của bạn
import HierarchicalTable, {
  type UserColumnDefinition,
  type UserFlatDataRow,
} from "@/components/custom/HierarchicalTable.vue";

import { Checkbox } from "@/components/ui/checkbox";
import { pivotService, type Dimension, type Metric } from "@/services/pivot";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css"; // vue-sonner v2 requires this import
import { toast } from "vue-sonner";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Loader2 } from "lucide-vue-next";
</script>

<script lang="ts">
export default {
  data() {
    return {
      metadata: {
        dimensions: [] as Dimension[],
        metrics: [] as Metric[],
      },

      table: {
        tab: "raw",
        data: {
          raw: [],
          pivot: [],
          tag: [],
          crm: [],
        },
        loaded: false,
        is_loading: false,
      },

      selected: {
        dimensions: [],
        metrics: [],
      },
    };
  },

  methods: {
    async loadData() {
      this.table.data[this.table.tab] = [];
      this.table.loaded = false;
      this.table.is_loading = true;
      localStorage.selected_metadata = JSON.stringify(this.selected);

      let res = await pivotService.getPivotData({
        dimensions: this.selected.dimensions,
        metrics: this.selected.metrics,
        type: this.table.tab,
      });

      this.table.is_loading = false;

      if (res.error) {
        return toast("Error", {
          description: res.detail,
          action: {
            label: "Copy",
            onClick: () => {
              navigator.clipboard.writeText(res.detail);
            },
          },
        });
      }

      this.table.data[this.table.tab] = res;
      this.table.loaded = true;
    },

    formatOutput(item: object, key: string) {
      let value = item[key];

      if (this.metadata.metrics.includes(key)) {
        return Number(value || 0).toLocaleString("vi-VN");
      }
      return value;
    },

    async loadDimension() {
      this.metadata.dimensions = [];
      this.metadata.metrics = [];

      let dim_metrics = await pivotService.getDimensionsAndMetrics();
      this.metadata.dimensions = dim_metrics.dimensions;
      this.metadata.metrics = dim_metrics.metrics;
    },
  },

  // watch: {
  //   "table.tab"(a) {
  //     if (this.table.loaded) {
  //       this.loadData();
  //     }
  //   },
  // },

  computed: {
    table_data() {
      return this.table.data[this.table.tab];
    },

    table_header() {
      if (!this.table_data.length) return [];
      return Object.keys(this.table_data[0]);
    },
  },

  async created() {
    await this.loadDimension();
    if (localStorage.selected_metadata) {
      this.selected = JSON.parse(localStorage.selected_metadata);
    }
    this.loadData();
  },
};
</script>

<template>
  <div>
    <Tabs default-value="raw" v-model="table.tab" class="w-[400px]">
      <TabsList>
        <TabsTrigger value="raw"> Raw </TabsTrigger>
        <TabsTrigger value="pivot"> Pivot </TabsTrigger>
        <TabsTrigger value="tag"> Tag </TabsTrigger>
        <TabsTrigger value="crm"> CRM </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>

  <div class="grid grid-cols-[1fr_300px] gap-4 h-full">
    <div class="bg-white border rounded-lg p-4 overflow-auto">
      <template v-if="table.is_loading">
        <div class="flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          Loading ...
        </div>
      </template>
      <template v-else>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead v-for="item in table_header">
                {{ item }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in table_data">
              <TableCell v-for="key in table_header">
                {{ formatOutput(item, key) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </template>

      <!-- </template> -->
    </div>

    <div class="border rounded-lg p-4 overflow-y-auto">
      <div class="space-y-4">
        <div class="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button>Action</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <!-- <DropdownMenuLabel>My </DropdownMenuLabel> -->
              <!-- <DropdownMenuSeparator /> -->
              <DropdownMenuItem @click="loadData">Load data</DropdownMenuItem>
              <DropdownMenuItem @click="loadDimension">
                Load dimension
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <!-- <Button @click="loadData" :is_loading="table.is_loading">
            Load Data
          </Button>
          <Button @click="loadDimension">Load dimension</Button> -->
        </div>

        <Accordion type="single">
          <AccordionItem>
            <AccordionTrigger class="text-sm font-semibold cursor-pointer"
              >Dimensions</AccordionTrigger
            >
            <AccordionContent class="space-y-2">
              <label
                v-for="dimension in metadata.dimensions"
                class="flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  v-model="selected.dimensions"
                  :value="dimension.key"
                />
                <div
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {{ dimension.label }}
                  {{
                    selected.dimensions.indexOf(dimension.key) !== -1
                      ? `(${selected.dimensions.indexOf(dimension.key) + 1})`
                      : ""
                  }}
                </div>
              </label>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Accordion type="single">
          <AccordionItem>
            <AccordionTrigger class="text-sm font-semibold cursor-pointer"
              >Metrics</AccordionTrigger
            >
            <AccordionContent>
              <div class="space-y-2">
                <label
                  v-for="metric in metadata.metrics"
                  class="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    v-model="selected.metrics"
                    :value="metric"
                  />
                  <div
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {{ metric }}
                  </div>
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  </div>

  <Toaster />
</template>
