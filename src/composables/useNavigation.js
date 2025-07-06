// composables/useNavigation.js
import { ref, watch } from "vue";
import { useRoute } from "vue-router"; // Nếu bạn dùng Vue Router

import { SquareTerminal } from "lucide-vue-next";

const navMain = ref([
  {
    title: "Playground",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        title: "Pivot",
        url: "/",
      },
    ],
  },
]);

const allNavItems = navMain.value.flatMap((item) =>
  item.items.map((x) => ({ ...x, parent_title: item.title }))
);

const currentNavItem = ref(null);

// Ví dụ cập nhật dựa trên route (cần điều chỉnh cho phù hợp)
export function useNavigation() {
  const route = useRoute();

  const updateCurrentNavItemBasedOnRoute = () => {
    const matchedItem = allNavItems.find((item) => {
      return item.url === route.path;
    });
    currentNavItem.value = matchedItem || null;
  };

  // Gọi khi route thay đổi hoặc khi component được mounted
  watch(route, updateCurrentNavItemBasedOnRoute, { immediate: true });

  // Hoặc một hàm để set thủ công từ AppSidebar
  //   const setCurrentNavItem = (item) => {
  //     currentNavItem.value = item;
  //   };

  return {
    navMain,
    currentNavItem,
    // setCurrentNavItem,
    // updateCurrentNavItemBasedOnRoute, // nếu bạn muốn cập nhật dựa trên route
  };
}
