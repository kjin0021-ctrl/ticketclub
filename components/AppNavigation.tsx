import {
  BellSimple,
  Tray,
  MapPin,
  PaperPlaneTilt,
  StarFour,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";

const navItems = [
  { label: "活动", icon: StarFour },
  { label: "计划", icon: PaperPlaneTilt },
  { label: "活点", icon: MapPin },
  { label: "我的", icon: UserCircle },
];

interface AppNavigationProps {
  activeItem?: "活动" | "计划" | "活点" | "我的";
  onManageArtists?: () => void;
  onHome?: () => void;
  onOpenInbox?: () => void;
  onOpenSpots?: () => void;
  onOpenNotifications?: () => void;
  inboxCount?: number;
  notificationCount?: number;
}

export function AppNavigation({ activeItem = "活动", onManageArtists, onHome, onOpenInbox, onOpenSpots, onOpenNotifications, inboxCount = 0, notificationCount = 0 }: AppNavigationProps) {
  return (
    <>
      <header className="app-header">
        <a className="brand" href="#top" aria-label="TicketClub 票来首页" onClick={onHome}>
          <span className="brand__mark">
            <StarFour size={18} weight="fill" aria-hidden="true" />
          </span>
          <span>TICKETCLUB</span>
          <small>票来</small>
        </a>

        <nav className="desktop-nav" aria-label="主导航">
          {navItems.map((item) => (
            <a key={item.label} className={item.label === activeItem ? "is-active" : ""} href={`#${item.label}`} onClick={(event) => { event.preventDefault(); if (item.label === "活动" || item.label === "计划") onHome?.(); if (item.label === "活点") onOpenSpots?.(); if (item.label === "我的") onManageArtists?.(); }}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" aria-label={`待识别收件箱，${inboxCount} 条待处理`} className="notification-button" onClick={onOpenInbox}>
            <Tray size={20} />
            {inboxCount ? <span aria-hidden="true" /> : null}
          </button>
          <button type="button" aria-label={`通知中心，${notificationCount} 条未读`} className="notification-button" onClick={onOpenNotifications}>
            <BellSimple size={20} />
            {notificationCount ? <span aria-hidden="true" /> : null}
          </button>
          <button className="user-avatar" type="button" aria-label="管理艺人与信息源" onClick={onManageArtists} />
        </div>
      </header>

      <nav className="mobile-nav" aria-label="手机端主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.label} className={item.label === activeItem ? "is-active" : ""} href={`#${item.label}`} onClick={(event) => { event.preventDefault(); if (item.label === "活动" || item.label === "计划") onHome?.(); if (item.label === "活点") onOpenSpots?.(); if (item.label === "我的") onManageArtists?.(); }}>
              <Icon size={20} weight={item.label === activeItem ? "fill" : "regular"} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
