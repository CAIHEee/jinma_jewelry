import type { AppView } from "../App";
import type { CurrentUser } from "../types/auth";

interface SidebarProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: CurrentUser;
}

const navGroups: Array<{
  title?: string;
  items: Array<{ key: AppView; label: string; helper: string; icon: string; featured?: boolean; moduleKey?: string; rootOnly?: boolean }>;
}> = [
  {
    items: [{ key: "asset-management", label: "资产管理", helper: "ASSET LIBRARY", icon: "folder", moduleKey: "asset_management" }],
  },
  {
    title: "创作与生成",
    items: [
      { key: "text-to-image", label: "文生图", helper: "TEXT TO IMAGE", icon: "gem", moduleKey: "text_to_image" },
      { key: "fusion", label: "多图融合", helper: "IMAGE FUSION", icon: "blend", moduleKey: "multi_image_fusion" },
      { key: "image-edit", label: "线稿转写实图", helper: "SKETCH TO REAL", icon: "pen", featured: true, moduleKey: "image_edit" },
      { key: "product-refine", label: "产品精修", helper: "PRODUCT REFINE", icon: "pen", moduleKey: "product_refine" },
      { key: "gemstone-design", label: "裸石设计", helper: "GEMSTONE DESIGN", icon: "gem", moduleKey: "gemstone_design" },
      { key: "upscale", label: "高清放大", helper: "UPSCALE", icon: "axis", moduleKey: "upscale" },
      { key: "multi-view", label: "生成多视图", helper: "MULTI-VIEW", icon: "cube", moduleKey: "multi_view" },
      { key: "grayscale-relief", label: "转灰度图", helper: "GRAYSCALE RELIEF", icon: "axis", moduleKey: "grayscale_relief" },
      { key: "multi-view-split", label: "多视图切图", helper: "MULTI-VIEW SPLIT", icon: "grid", moduleKey: "multi_view_split" },
      { key: "history", label: "历史记录", helper: "HISTORY", icon: "layers", moduleKey: "history" },
    ],
  },
  {
    title: "Root",
    items: [{ key: "admin", label: "系统管理", helper: "ROOT ADMIN", icon: "layers", rootOnly: true }],
  },
];

function hasPermission(currentUser: CurrentUser, moduleKey?: string, rootOnly?: boolean) {
  if (rootOnly) {
    return currentUser.role === "root";
  }
  if (!moduleKey) {
    return true;
  }
  if (currentUser.role === "root") {
    return true;
  }
  return currentUser.permissions.some((item) => item.module_key === moduleKey && item.is_enabled);
}

export function Sidebar({ activeView, onChange, collapsed, onToggleCollapse, currentUser }: SidebarProps) {
  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-topbar">
        <div className="brand-block sidebar-brand">
          <p className="eyebrow">JINMA JEWELRY</p>
          {!collapsed ? <h2>金马珠宝</h2> : null}
          {!collapsed ? <p className="sidebar-copy">珠宝设计生成、编辑、资产沉淀一体化工作台</p> : null}
        </div>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "展开导航栏" : "收起导航栏"}
          title={collapsed ? "展开导航栏" : "收起导航栏"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group, groupIndex) => {
          const items = group.items.filter((item) => hasPermission(currentUser, item.moduleKey, item.rootOnly));
          if (items.length === 0) {
            return null;
          }
          return (
            <div className="nav-group" key={group.title ?? `group-${groupIndex}`}>
              {group.title && !collapsed ? <div className="nav-section-title">{group.title}</div> : null}
              <div className={items.length === 1 ? "nav-card-grid single" : "nav-card-grid"}>
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      "nav-item",
                      item.featured ? "featured" : "",
                      item.key === activeView ? "active" : "",
                      collapsed ? "collapsed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onChange(item.key)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={`nav-icon ${item.icon}`} aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : null}
                    {!collapsed ? <small>{item.helper}</small> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
