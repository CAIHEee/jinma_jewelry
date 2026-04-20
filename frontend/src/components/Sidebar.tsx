import type { AppView } from "../App";

interface SidebarProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navGroups: Array<{
  title?: string;
  items: Array<{ key: AppView; label: string; helper: string; icon: string; featured?: boolean }>;
}> = [
  {
    items: [{ key: "asset-management", label: "资产管理", helper: "ASSET LIBRARY", icon: "folder" }],
  },
  {
    title: "创作与生成",
    items: [
      { key: "text-to-image", label: "文生图", helper: "TEXT TO IMAGE", icon: "gem" },
      { key: "fusion", label: "多图融合", helper: "IMAGE FUSION", icon: "blend" },
      { key: "image-edit", label: "线稿转写实图", helper: "SKETCH TO REAL", icon: "pen", featured: true },
      { key: "multi-view", label: "生成多视图", helper: "MULTI-VIEW", icon: "cube" },
      { key: "grayscale-relief", label: "转灰度图", helper: "GRAYSCALE RELIEF", icon: "axis" },
      { key: "multi-view-split", label: "多视图切图", helper: "MULTI-VIEW SPLIT", icon: "grid" },
      { key: "history", label: "历史记录", helper: "HISTORY", icon: "layers" },
    ],
  },
];

export function Sidebar({ activeView, onChange, collapsed, onToggleCollapse }: SidebarProps) {
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
        {navGroups.map((group, groupIndex) => (
          <div className="nav-group" key={group.title ?? `group-${groupIndex}`}>
            {group.title && !collapsed ? <div className="nav-section-title">{group.title}</div> : null}
            <div className={group.items.length === 1 ? "nav-card-grid single" : "nav-card-grid"}>
              {group.items.map((item) => (
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
        ))}
      </nav>
    </aside>
  );
}
