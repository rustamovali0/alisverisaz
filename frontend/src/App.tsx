import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Plus,
  Minus,
  Check,
  CheckCheck,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Star,
  SlidersHorizontal,
  Grid2X2,
  List,
  MapPin,
  Mail,
  Phone,
  Clock,
  LogOut,
  Package,
  LayoutDashboard,
  Store,
  Bell,
  MessageCircle,
  Settings,
  ChartNoAxesCombined,
  Users,
  Crown,
  Upload,
  ImagePlus,
  Trash2,
  Pencil,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Send,
  Home,
  Shirt,
  Armchair,
  Sparkles,
  Dumbbell,
  Baby,
  Watch,
  Car,
  ExternalLink,
  Copy,
  Camera,
  ChevronLeft,
  TicketPercent,
  LockKeyhole,
  Globe,
  Leaf,
  ArrowDownRight,
  Wallet,
  ShoppingCart,
  FileText,
} from "lucide-react";
import {
  products as initialProducts,
  categories,
  stores,
  img,
  money,
  type Product,
} from "./data";
import {
  filterProducts,
  defaultFilters,
  validRange,
  readState,
  saveState,
  type Filters,
} from "./core";
type CartItem = { id: number; quantity: number };
type Order = {
  id: string;
  date: string;
  items: (CartItem & { price: number; name: string; store: string })[];
  total: number;
  name: string;
  phone: string;
  address: string;
  status: string;
};
type Profile = { name: string; email: string; phone: string; address: string };
const categoryIcons = [
  Headphones,
  Shirt,
  Armchair,
  Sparkles,
  Dumbbell,
  Baby,
  Watch,
  Car,
];
function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    el?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = el?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, []);
  return (
    <div
      className={"overlay " + (drawer ? "drawer-overlay" : "")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={"modal " + (wide ? "wide " : "") + (drawer ? "drawer" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Bağla">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Empty({
  icon = <Package size={38} />,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "home");
  const [products, setProducts] = useState<Product[]>(() =>
    readState("products", initialProducts),
  );
  const [favorites, setFavorites] = useState<number[]>(() =>
    readState("favorites", []),
  );
  const [cart, setCart] = useState<CartItem[]>(() => readState("cart", []));
  const [orders, setOrders] = useState<Order[]>(() => readState("orders", []));
  const [profile, setProfile] = useState<Profile>(() =>
    readState("profile", { name: "", email: "", phone: "", address: "" }),
  );
  const [session, setSession] = useState<boolean>(() =>
    readState("session", false),
  );
  const [role, setRole] = useState("buyer");
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    ...Object.fromEntries(
      [...new URLSearchParams(location.search)].filter(
        ([k]) => !["discount", "vip", "rental", "stock"].includes(k),
      ),
    ),
    ...Object.fromEntries(
      ["discount", "vip", "rental", "stock"].map((k) => [
        k,
        new URLSearchParams(location.search).get(k) === "true",
      ]),
    ),
  }));
  const [search, setSearch] = useState(filters.q);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readState("recent", []));
  const [page, setPage] = useState(1);
  const [list, setList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("overview");
  const [noticeRead, setNoticeRead] = useState(() =>
    readState("noticeRead", false),
  );
  const [storeName, setStoreName] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; time: string }[]>(
    () => readState("messages", []),
  );
  const [orderDone, setOrderDone] = useState<Order | null>(null);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [addresses, setAddresses] = useState<string[]>(() =>
    readState("addresses", []),
  );
  const [accountTab, setAccountTab] = useState("overview");
  const [storeProfile, setStoreProfile] = useState(() =>
    readState("store", {
      name: "TechZone",
      slug: "techzone",
      description:
        "Texnologiya bir addım önündə. Gündəlik həyatınızı asanlaşdıran seçilmiş elektronika məhsulları.",
      phone: "+994 50 555 12 34",
      hours: "09:00–20:00",
      delivery: "Bakı daxili 1–2 iş günü ərzində çatdırılma.",
    }),
  );
  const notify = (s: string) => setToast(s);
  const go = (r: string) => {
    location.hash = r;
    setMenu(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    const f = () => {
      setRoute(location.hash.slice(1) || "home");
      setPage(1);
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    saveState("products", products);
  }, [products]);
  useEffect(() => {
    saveState("favorites", favorites);
  }, [favorites]);
  useEffect(() => {
    saveState("cart", cart);
  }, [cart]);
  useEffect(() => {
    saveState("orders", orders);
  }, [orders]);
  useEffect(() => {
    saveState("profile", profile);
  }, [profile]);
  useEffect(() => {
    saveState("session", session);
  }, [session]);
  useEffect(() => {
    saveState("messages", messages);
  }, [messages]);
  useEffect(() => {
    saveState("addresses", addresses);
  }, [addresses]);
  useEffect(() => {
    saveState("store", storeProfile);
  }, [storeProfile]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3300);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === "az-cart") setCart(readState("cart", []));
      if (e.key === "az-favorites") setFavorites(readState("favorites", []));
      if (e.key === "az-session") setSession(readState("session", false));
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== defaultFilters[k as keyof Filters]) p.set(k, String(v));
    });
    history.replaceState(
      null,
      "",
      location.pathname + (p.size ? "?" + p.toString() : "") + location.hash,
    );
    setPage(1);
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [filters]);
  useEffect(() => {
    document.title =
      (route === "home"
        ? "Hər ehtiyacına bir tapıntı"
        : route === "catalog"
          ? "Məhsullar"
          : route === "stores"
            ? "Mağazalar"
            : route === "favorites"
              ? "Sevimlilər"
              : route === "dashboard"
                ? "İdarəetmə paneli"
                : route === "checkout"
                  ? "Sifarişi tamamla"
                  : "Şəxsi kabinet") + " | ALISVERIS.AZ";
  }, [route]);
  const favorite = (id: number) => {
    setFavorites((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  };
  const addCart = (p: Product, q = 1) => {
    const existing = cart.find((x) => x.id === p.id)?.quantity || 0;
    if (existing + q > p.stock) {
      notify("Stokda bu qədər məhsul yoxdur.");
      return;
    }
    setCart((a) =>
      a.some((x) => x.id === p.id)
        ? a.map((x) => (x.id === p.id ? { ...x, quantity: x.quantity + q } : x))
        : [...a, { id: p.id, quantity: q }],
    );
    notify("Məhsul səbətə əlavə edildi");
  };
  const total = cart.reduce(
    (s, c) =>
      s + (products.find((p) => p.id === c.id)?.price || 0) * c.quantity,
    0,
  );
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const chooseCategory = (category: string) => {
    setFilters({ ...defaultFilters, category });
    go("catalog");
  };
  const doSearch = (q = search) => {
    setSearch(q);
    setFilters({ ...defaultFilters, q });
    if (q.trim()) {
      const a = [q, ...recent.filter((x) => x !== q)].slice(0, 5);
      setRecent(a);
      saveState("recent", a);
    }
    setSearchOpen(false);
    go("catalog");
  };
  const filtered = validRange(filters.min, filters.max)
    ? filterProducts(
        products.filter(
          (p) =>
            p.status !== "Qaralama" &&
            p.status !== "Gözləyir" &&
            p.status !== "Deaktiv",
        ),
        filters,
      )
    : [];
  const openProduct = (p: Product) => {
    setSelected(p);
    setModal("product");
  };
  const Button = ({
    children,
    onClick,
    secondary = false,
  }: {
    children: ReactNode;
    onClick: () => void;
    secondary?: boolean;
  }) => (
    <button className={secondary ? "btn secondary" : "btn"} onClick={onClick}>
      {children}
    </button>
  );
  const ProductCard = ({ p }: { p: Product }) => (
    <article className="product-card">
      <div className="product-image">
        <button
          className="image-link"
          onClick={() => openProduct(p)}
          aria-label={`${p.name} — ətraflı`}
        >
          <img src={img(p.image)} alt={p.name} loading="lazy" />
        </button>
        <div className="badges">
          {p.vip && (
            <span className="badge vip">
              <Crown size={11} /> VIP
            </span>
          )}
          {p.oldPrice && (
            <span className="badge sale">
              −{Math.round((1 - p.price / p.oldPrice) * 100)}%
            </span>
          )}
          {p.rental && <span className="badge rent">İcarə</span>}
        </div>
        <button
          className={
            "favorite-btn " + (favorites.includes(p.id) ? "active" : "")
          }
          onClick={() => favorite(p.id)}
          aria-label={
            favorites.includes(p.id)
              ? "Sevimlilərdən çıxar"
              : "Sevimlilərə əlavə et"
          }
          aria-pressed={favorites.includes(p.id)}
        >
          <Heart
            size={18}
            fill={favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
        <span className="image-watermark">alisveris.az</span>
      </div>
      <div className="product-info">
        <div className="product-store">
          <span>{p.store}</span>
          <ShieldCheck size={12} />
        </div>
        <button className="product-name" onClick={() => openProduct(p)}>
          {p.name}
        </button>
        <div className="rating">
          <Star size={12} fill="currentColor" />
          <strong>{p.rating.toFixed(1)}</strong>
          <span>({p.reviews})</span>
        </div>
        <div className="price-row">
          <div>
            <strong>{money(p.price)}</strong>
            {p.rental && <small> / gün</small>}
            {p.oldPrice && <del>{money(p.oldPrice)}</del>}
          </div>
          <button
            className="add-btn"
            onClick={() => addCart(p)}
            aria-label={`${p.name} səbətə əlavə et`}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
  const heading = (kicker: string, title: string, action?: ReactNode) => (
    <div className="section-head">
      <div>
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
  const linkAction = (text: string, fn: () => void) => (
    <button className="text-link" onClick={fn}>
      {text}
      <ArrowRight size={16} />
    </button>
  );
  const notifications = (
    <div className="notifications">
      {[
        {
          title: "ALISVERIS.AZ-a xoş gəlmisiniz!",
          text: "Sevdiyiniz məhsulları kəşf edin, sevimlilərə əlavə edin və mağazalarla tanış olun.",
          icon: <ShoppingBag />,
        },
        {
          title: "Yeni mövsüm, yeni tapıntılar",
          text: "Seçilmiş kolleksiyada sizin üçün maraqlı məhsullar var.",
          icon: <Leaf />,
        },
      ].map((n, i) => (
        <div
          className={"notification " + (!noticeRead ? "unread" : "")}
          key={n.title}
        >
          <span className="notice-icon">{n.icon}</span>
          <div>
            <h4>{n.title}</h4>
            <p>{n.text}</p>
            <small>{i ? "Demo elan" : "İndi"}</small>
          </div>
          {!noticeRead && <i />}
        </div>
      ))}
      <button
        className="btn secondary full"
        onClick={() => {
          setNoticeRead(true);
          saveState("noticeRead", true);
        }}
      >
        <CheckCheck size={16} />
        Hamısını oxunmuş et
      </button>
    </div>
  );
  function cartContent() {
    return cart.length ? (
      <>
        <div className="cart-groups">
          {[
            ...new Set(
              cart.map((c) => products.find((p) => p.id === c.id)?.store),
            ),
          ].map((s) => (
            <section key={s}>
              <h4>
                <Store size={15} />
                {s}
                <ShieldCheck size={14} />
              </h4>
              {cart
                .filter((c) => products.find((p) => p.id === c.id)?.store === s)
                .map((c) => {
                  const p = products.find((p) => p.id === c.id);
                  if (!p) return null;
                  return (
                    <div className="cart-item" key={c.id}>
                      <img src={img(p.image)} alt={p.name} />
                      <div>
                        <button
                          className="plain"
                          onClick={() => openProduct(p)}
                        >
                          {p.name}
                        </button>
                        <strong>{money(p.price)}</strong>
                        <div className="quantity">
                          <button
                            aria-label="Sayı azalt"
                            onClick={() =>
                              setCart((a) =>
                                a.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        quantity: Math.max(1, x.quantity - 1),
                                      }
                                    : x,
                                ),
                              )
                            }
                            disabled={c.quantity === 1}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{c.quantity}</span>
                          <button
                            aria-label="Sayı artır"
                            disabled={c.quantity >= p.stock}
                            onClick={() =>
                              setCart((a) =>
                                a.map((x) =>
                                  x.id === c.id
                                    ? {
                                        ...x,
                                        quantity: Math.min(
                                          p.stock,
                                          x.quantity + 1,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="icon-btn muted"
                        aria-label="Məhsulu səbətdən sil"
                        onClick={() =>
                          setCart((a) => a.filter((x) => x.id !== c.id))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
            </section>
          ))}
        </div>
        <div className="cart-bottom">
          <div className="shipping-progress">
            <Truck size={17} />
            {total >= 100
              ? "Pulsuz çatdırılma qazandınız!"
              : `Pulsuz çatdırılmaya ${money(100 - total)} qaldı`}
            <div>
              <i style={{ width: Math.min(total, 100) + "%" }} />
            </div>
          </div>
          <div className="summary-row">
            <span>Ümumi məbləğ</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="fine-print">Çatdırılma sifariş zamanı hesablanır.</p>
          <button
            className="btn full"
            onClick={() => {
              setModal("");
              go("checkout");
            }}
          >
            Sifarişi rəsmiləşdir
            <ArrowRight size={17} />
          </button>
          <button className="text-link center" onClick={() => setModal("")}>
            Alış-verişə davam et
          </button>
        </div>
      </>
    ) : (
      <Empty
        icon={<ShoppingBag size={42} />}
        title="Səbətiniz sizi gözləyir"
        text="Bəyəndiyiniz məhsulları səbətə əlavə edərək alış-verişə başlayın."
        action={
          <Button
            onClick={() => {
              setModal("");
              go("catalog");
            }}
          >
            Məhsulları kəşf et
            <ArrowRight size={16} />
          </Button>
        }
      />
    );
  }
  const filterControls = (
    <>
      <div className="filter-group">
        <h4>Kateqoriyalar</h4>
        <button
          className={"category-filter " + (!filters.category ? "chosen" : "")}
          onClick={() => setFilters((f) => ({ ...f, category: "" }))}
        >
          <span>Bütün kateqoriyalar</span>
          <span>{products.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={
              "category-filter " + (filters.category === c.id ? "chosen" : "")
            }
            onClick={() => setFilters((f) => ({ ...f, category: c.id }))}
          >
            <span>{c.label}</span>
            <span>{products.filter((p) => p.category === c.id).length}</span>
          </button>
        ))}
      </div>
      <div className="filter-group">
        <h4>Qiymət aralığı</h4>
        <div className="range-inputs">
          <label>
            <span>Minimum</span>
            <input
              aria-label="Minimum qiymət"
              type="number"
              min="0"
              placeholder="0 ₼"
              value={filters.min}
              onChange={(e) =>
                setFilters((f) => ({ ...f, min: e.target.value }))
              }
            />
          </label>
          <span>—</span>
          <label>
            <span>Maksimum</span>
            <input
              aria-label="Maksimum qiymət"
              type="number"
              min="0"
              placeholder="1 000 ₼"
              value={filters.max}
              onChange={(e) =>
                setFilters((f) => ({ ...f, max: e.target.value }))
              }
            />
          </label>
        </div>
        {!validRange(filters.min, filters.max) && (
          <p className="error">Düzgün qiymət aralığı daxil edin.</p>
        )}
      </div>
      <div className="filter-group">
        <h4>Seçimlər</h4>
        {[
          ["discount", "Endirimli məhsullar"],
          ["vip", "VIP məhsullar"],
          ["rental", "İcarəyə verilənlər"],
          ["stock", "Yalnız stokda olanlar"],
        ].map(([k, t]) => (
          <label className="check-label" key={k}>
            <input
              type="checkbox"
              checked={!!filters[k as keyof Filters]}
              onChange={(e) =>
                setFilters((f) => ({ ...f, [k]: e.target.checked }))
              }
            />
            {t}
            {k === "vip" && <Crown size={14} className="gold" />}
          </label>
        ))}
      </div>
      <div className="filter-group">
        <h4>Mağaza</h4>
        <select
          aria-label="Mağazaya görə filtr"
          value={filters.store}
          onChange={(e) => setFilters((f) => ({ ...f, store: e.target.value }))}
        >
          <option value="">Bütün mağazalar</option>
          {[...new Set(products.map((p) => p.store))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <h4>Reytinq</h4>
        <select
          aria-label="Minimum reytinq"
          value={filters.rating}
          onChange={(e) =>
            setFilters((f) => ({ ...f, rating: e.target.value }))
          }
        >
          <option value="">Bütün reytinqlər</option>
          <option value="4.8">4.8 və daha yüksək</option>
          <option value="4.5">4.5 və daha yüksək</option>
        </select>
      </div>
      <button
        className="text-link muted"
        onClick={() => {
          setFilters(defaultFilters);
          setSearch("");
        }}
      >
        <RotateCcw size={14} />
        Filtrləri təmizlə
      </button>
    </>
  );
  function dashboard() {
    const isSeller = role === "seller";
    const isAdmin = !isSeller;
    const tabs = [
      ["overview", "Ümumi icmal", LayoutDashboard],
      ["products", "Məhsullar", Package],
      ["orders", "Sifarişlər", ShoppingBag],
      ...(isAdmin
        ? [
            ["stores", "Mağazalar", Store],
            ["users", "İstifadəçilər", Users],
            ["categories", "Kateqoriyalar", Grid2X2],
          ]
        : [["store", "Mağazam", Store]]),
      ["analytics", "Analitika", ChartNoAxesCombined],
      ["messages", "Mesajlar", MessageCircle],
      ["reviews", "Rəylər", Star],
      ["notifications", "Bildirişlər", Bell],
      ["vip", "VIP xidmətləri", Crown],
      ["settings", "Parametrlər", Settings],
    ];
    const mine = isSeller
      ? products.filter((p) => p.store === "TechZone")
      : products;
    const sales = orders.reduce((s, o) => s + o.total, 0);
    return (
      <div className="dashboard-shell">
        <aside className="dash-sidebar">
          <div className="dash-user">
            <span className="store-logo small">
              {isSeller ? "TZ" : role === "radmin" ? "RA" : "A"}
            </span>
            <div>
              <strong>
                {isSeller
                  ? "TechZone"
                  : role === "radmin"
                    ? "RAdmin"
                    : "Administrator"}
              </strong>
              <small>Demo {isSeller ? "satıcı" : "idarəetmə"} paneli</small>
            </div>
          </div>
          {tabs.map(([key, text, Icon]) => (
            <button
              key={String(key)}
              className={dashboardTab === key ? "active" : ""}
              onClick={() => setDashboardTab(String(key))}
            >
              {typeof Icon !== "string" && <Icon size={18} />}
              <span>{String(text)}</span>
              {key === "products" && <small>{mine.length}</small>}
            </button>
          ))}
          <div className="dash-bottom">
            <p>Mağazanızın potensialını artırın</p>
            <button onClick={() => setDashboardTab("vip")}>
              VIP ilə önə çıxın
              <Crown size={14} />
            </button>
          </div>
        </aside>
        <div className="dash-main">
          <div className="dash-title">
            <div>
              <span className="eyebrow">
                {isSeller ? "SATICI PANELİ" : "İDARƏETMƏ MƏRKƏZİ"}
              </span>
              <h1>
                {String(
                  tabs.find((x) => x[0] === dashboardTab)?.[1] || "Ümumi icmal",
                )}
              </h1>
              <p>Hər şey nəzarətinizdə. Uğurlu gün arzulayırıq!</p>
            </div>
            <button
              className="btn"
              onClick={() => {
                setEditProduct(null);
                setModal("edit-product");
              }}
            >
              <Plus size={17} />
              Məhsul əlavə et
            </button>
          </div>
          <div className="demo-notice">
            <Eye size={16} />
            Demo baxış rejimi. Dəyişikliklər yalnız bu brauzerdə saxlanılır.
          </div>
          {dashboardTab === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  [
                    Package,
                    "Aktiv məhsullar",
                    mine.filter((p) => !p.status || p.status === "Aktiv")
                      .length,
                    "Vitrində göstərilən məhsullar",
                  ],
                  [
                    ShoppingBag,
                    "Sifarişlər",
                    orders.length,
                    "Demo sifarişlərin sayı",
                  ],
                  [
                    Wallet,
                    "Satış məbləği",
                    money(sales),
                    "Bu brauzerdəki sifarişlər",
                  ],
                  [
                    AlertCircle,
                    "Stoku azalanlar",
                    mine.filter((p) => p.stock < 10).length,
                    "10 ədəddən az qalan",
                  ],
                ].map(([Icon, t, n, s]) => (
                  <div className="stat-card" key={String(t)}>
                    {typeof Icon !== "string" && typeof Icon !== "number" && (
                      <Icon size={21} />
                    )}
                    <span>{String(t)}</span>
                    <strong>{String(n)}</strong>
                    <small>{String(s)}</small>
                  </div>
                ))}
              </div>
              <div className="dashboard-columns">
                <div className="panel">
                  <div className="panel-heading">
                    <h3>Son sifarişlər</h3>
                    {linkAction("Hamısına bax", () =>
                      setDashboardTab("orders"),
                    )}
                  </div>
                  {orderTable()}
                </div>
                <div className="panel">
                  <h3>Mağaza hazırlığı</h3>
                  <div className="completion">
                    <strong>3 / 4</strong>
                    <span>addım tamamlanıb</span>
                    <div>
                      <i />
                    </div>
                  </div>
                  {[
                    "Mağaza məlumatları",
                    "Əlaqə məlumatları",
                    "İlk məhsul əlavə edildi",
                    "Loqo və banner əlavə edin",
                  ].map((x, i) => (
                    <div className="setup-task" key={x}>
                      {i < 3 ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Camera size={17} />
                      )}
                      <span>{x}</span>
                      {i === 3 && (
                        <button
                          aria-label="Mağaza görünüşünü tamamla"
                          onClick={() => setDashboardTab("store")}
                        >
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <h3>Seçilmiş məhsullar</h3>
                  {linkAction("Məhsulları idarə et", () =>
                    setDashboardTab("products"),
                  )}
                </div>
                {productTable(mine.slice(0, 4))}
              </div>
            </>
          )}
          {dashboardTab === "products" && (
            <div className="panel">
              <div className="table-tools">
                <div className="mini-search">
                  <Search size={16} />
                  <input
                    placeholder="Məhsul axtar..."
                    aria-label="Paneldə məhsul axtar"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <button
                  className="btn secondary"
                  onClick={() => setModal("import")}
                >
                  <Upload size={16} />
                  CSV import
                </button>
                <button
                  className="btn secondary"
                  onClick={() => exportCSV(mine)}
                >
                  <Download size={16} />
                  İxrac et
                </button>
              </div>
              {productTable(
                mine.filter((p) =>
                  p.name
                    .toLocaleLowerCase()
                    .includes(message.toLocaleLowerCase()),
                ),
              )}
            </div>
          )}
          {dashboardTab === "orders" && (
            <div className="panel">
              <h3>Bütün sifarişlər</h3>
              {orderTable()}
            </div>
          )}
          {dashboardTab === "analytics" && (
            <div className="panel">
              <div className="panel-heading">
                <h3>Satış nəticələri</h3>
                <select
                  aria-label="Analitika müddəti"
                  onChange={(e) =>
                    notify(e.target.value + " nəticələri göstərilir")
                  }
                >
                  <option>Bu ay</option>
                  <option>Bu həftə</option>
                  <option>Bu gün</option>
                </select>
              </div>
              {orders.length ? (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span>Sifarişlər</span>
                      <strong>{orders.length}</strong>
                    </div>
                    <div className="stat-card">
                      <span>Satış məbləği</span>
                      <strong>{money(sales)}</strong>
                    </div>
                    <div className="stat-card">
                      <span>Orta sifariş</span>
                      <strong>{money(sales / orders.length)}</strong>
                    </div>
                  </div>
                  <div className="sales-bars">
                    {orders.slice(-12).map((o) => (
                      <div key={o.id}>
                        <strong>{money(o.total)}</strong>
                        <i
                          style={{
                            height: Math.max(
                              10,
                              (o.total /
                                Math.max(...orders.map((x) => x.total))) *
                                160,
                            ),
                          }}
                        />
                        <small>{o.id.slice(-4)}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  icon={<ChartNoAxesCombined size={38} />}
                  title="İlk sifarişinizlə başlayır"
                  text="Demo checkout vasitəsilə yaradılan sifarişlər burada hesablanacaq."
                  action={
                    <Button onClick={() => go("catalog")}>
                      Məhsullara bax
                    </Button>
                  }
                />
              )}
            </div>
          )}
          {dashboardTab === "store" && (
            <div className="panel">
              <h3>Mağaza məlumatları</h3>
              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  notify("Mağaza məlumatları saxlanıldı");
                }}
              >
                <Field
                  label="Mağazanın adı"
                  value={storeProfile.name}
                  onChange={(v) => setStoreProfile((p) => ({ ...p, name: v }))}
                />
                <Field
                  label="Mağaza URL-i"
                  value={storeProfile.slug}
                  onChange={(v) =>
                    setStoreProfile((p) => ({
                      ...p,
                      slug: v.replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                />
                <label className="span-2">
                  Mağaza haqqında
                  <textarea
                    value={storeProfile.description}
                    onChange={(e) =>
                      setStoreProfile((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </label>
                <Field
                  label="Əlaqə və WhatsApp"
                  value={storeProfile.phone}
                  onChange={(v) => setStoreProfile((p) => ({ ...p, phone: v }))}
                />
                <Field
                  label="İş saatları"
                  value={storeProfile.hours}
                  onChange={(v) => setStoreProfile((p) => ({ ...p, hours: v }))}
                />
                <label className="span-2">
                  Çatdırılma məlumatı
                  <textarea
                    value={storeProfile.delivery}
                    onChange={(e) =>
                      setStoreProfile((p) => ({
                        ...p,
                        delivery: e.target.value,
                      }))
                    }
                  />
                </label>
                <button className="btn" type="submit">
                  <Check size={16} />
                  Məlumatları saxla
                </button>
              </form>
              <hr />
              <h3>Mağaza görünüşü</h3>
              <div className="upload-grid">
                {["Loqo", "Banner"].map((t) => (
                  <label className="upload-box" key={t}>
                    <ImagePlus />
                    <strong>{t} əlavə et</strong>
                    <span>JPG, PNG, WEBP · maksimum 5 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 5 * 1024 * 1024) {
                          notify("Maksimum fayl ölçüsü 5 MB olmalıdır");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          saveState("store-" + t, reader.result);
                          notify(t + " saxlanıldı");
                        };
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          {dashboardTab === "stores" && (
            <div className="store-grid dashboard-store-grid">
              {stores.map((s) => (
                <div className="store-card" key={s.name}>
                  <div
                    className="store-cover"
                    style={{ background: s.color + "12" }}
                  >
                    <span
                      className="store-logo"
                      style={{ background: s.color }}
                    >
                      {s.logo}
                    </span>
                    <Crown size={18} className="gold" />
                  </div>
                  <div className="store-body">
                    <h3>
                      {s.name}
                      <ShieldCheck size={16} />
                    </h3>
                    <p>{s.tag}</p>
                    <div className="store-meta">
                      <span>
                        <Star size={13} fill="currentColor" />
                        {s.rating}
                      </span>
                      <small>
                        {products.filter((p) => p.store === s.name).length}{" "}
                        məhsul
                      </small>
                    </div>
                    <button
                      className="btn secondary full"
                      onClick={() => {
                        setStoreName(s.name);
                        go("store");
                      }}
                    >
                      Vitrinə bax
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {dashboardTab === "users" && (
            <div className="panel">
              <h3>İstifadəçilər</h3>
              {profile.name ? (
                <div className="user-row">
                  <span className="avatar">{profile.name[0]}</span>
                  <div>
                    <strong>{profile.name}</strong>
                    <p>{profile.email}</p>
                  </div>
                  <span className="status">Demo alıcı</span>
                </div>
              ) : (
                <Empty
                  icon={<Users size={38} />}
                  title="Hələ istifadəçi yoxdur"
                  text="Demo giriş forması ilə hesab yaradaraq bu görünüşü sınaya bilərsiniz."
                />
              )}
            </div>
          )}
          {dashboardTab === "categories" && (
            <div className="panel">
              <h3>Kateqoriyaların idarə edilməsi</h3>
              {categories.map((c, i) => (
                <div className="category-admin" key={c.id}>
                  <span>{i + 1}</span>
                  <strong>{c.label}</strong>
                  <span>
                    {products.filter((p) => p.category === c.id).length} məhsul
                  </span>
                  <button
                    className="icon-btn"
                    aria-label="Kateqoriyanı redaktə et"
                    onClick={() => {
                      setSearch(c.label);
                      notify("Kateqoriya: " + c.label);
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {dashboardTab === "messages" && messagePanel()}
          {dashboardTab === "reviews" && reviewsPanel()}
          {dashboardTab === "notifications" && (
            <div className="panel">{notifications}</div>
          )}
          {dashboardTab === "vip" && vipPanel()}
          {dashboardTab === "settings" && (
            <div className="panel">
              <h3>
                {role === "radmin"
                  ? "Sistem parametrləri"
                  : "Bildiriş və hesab ayarları"}
              </h3>
              {(role === "radmin"
                ? [
                    "Satıcılar üçün təsdiq tələb et",
                    "Məhsul moderasiyasını aktiv et",
                    "Mağaza subdomainlərinə icazə ver",
                    "VIP məhsulları əvvəl göstər",
                  ]
                : [
                    "Yeni sifariş bildirişləri",
                    "Yeni mesaj bildirişləri",
                    "Stok azalması bildirişləri",
                    "E-poçt bildirişləri",
                  ]
              ).map((t) => (
                <Toggle key={t} label={t} />
              ))}
              <button
                className="btn"
                onClick={() => notify("Demo parametrlər saxlanıldı")}
              >
                Parametrləri saxla
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  function productTable(items: Product[]) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Məhsul</th>
              <th>Qiymət</th>
              <th>Stok</th>
              <th>Status</th>
              <th aria-label="Əməliyyatlar" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="table-product">
                    <img src={img(p.image)} alt="" />
                    <div>
                      <button className="plain" onClick={() => openProduct(p)}>
                        {p.name}
                      </button>
                      <small>
                        {p.category} · SKU-{p.id.toString().padStart(4, "0")}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{money(p.price)}</strong>
                </td>
                <td>
                  <span className={p.stock < 10 ? "low-stock" : ""}>
                    {p.stock} ədəd
                  </span>
                </td>
                <td>
                  <select
                    className="status-select"
                    aria-label={p.name + " status"}
                    value={p.status || "Aktiv"}
                    onChange={(e) =>
                      setProducts((a) =>
                        a.map((x) =>
                          x.id === p.id ? { ...x, status: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option>Aktiv</option>
                    <option>Deaktiv</option>
                    <option>Qaralama</option>
                    <option>Gözləyir</option>
                  </select>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-btn"
                      aria-label="Məhsulu redaktə et"
                      onClick={() => {
                        setEditProduct(p);
                        setModal("edit-product");
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label="Məhsulu sil"
                      onClick={() => {
                        setEditProduct(p);
                        setModal("delete-product");
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty
            title="Məhsul tapılmadı"
            text="Axtarışı dəyişin və ya yeni məhsul əlavə edin."
          />
        )}
      </div>
    );
  }
  function orderTable() {
    return orders.length ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sifariş</th>
              <th>Müştəri</th>
              <th>Məbləğ</th>
              <th>Status</th>
              <th>Tarix</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <button
                    className="plain green"
                    onClick={() => {
                      setOrderDone(o);
                      setModal("order-detail");
                    }}
                  >
                    #{o.id}
                  </button>
                </td>
                <td>{o.name}</td>
                <td>
                  <strong>{money(o.total)}</strong>
                </td>
                <td>
                  <select
                    className="status-select"
                    aria-label="Sifariş statusu"
                    value={o.status}
                    onChange={(e) =>
                      setOrders((a) =>
                        a.map((x) =>
                          x.id === o.id ? { ...x, status: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {[
                      "Gözləyir",
                      "Təsdiqləndi",
                      "Hazırlanır",
                      "Çatdırılır",
                      "Tamamlandı",
                      "Ləğv edildi",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{new Date(o.date).toLocaleDateString("az-AZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        icon={<ShoppingBag size={34} />}
        title="Sifarişlər burada görünəcək"
        text="Demo sifariş yaradıldıqda məlumatları bu paneldə görə bilərsiniz."
        action={
          <Button secondary onClick={() => go("catalog")}>
            Vitrinə keç
            <ArrowRight size={15} />
          </Button>
        }
      />
    );
  }
  function messagePanel() {
    return (
      <div className="panel messaging">
        <div className="chat-person">
          <span className="store-logo small">TZ</span>
          <div>
            <strong>TechZone</strong>
            <small>Demo söhbət</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="chat-messages">
          <div className="bubble received">
            Salam! Məhsullarımız haqqında sualınız varsa, yaza bilərsiniz.
            <small>Demo mesaj</small>
          </div>
          {messages.map((m, i) => (
            <div className="bubble sent" key={i}>
              {m.text}
              <small>
                {m.time}
                <CheckCheck size={12} />
              </small>
            </div>
          ))}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (!message.trim()) return;
            setMessages((a) => [
              ...a,
              {
                text: message.trim(),
                time: new Date().toLocaleTimeString("az-AZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
            setMessage("");
          }}
        >
          <input
            placeholder="Mesajınızı yazın..."
            aria-label="Mesaj"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="btn" aria-label="Mesajı göndər">
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }
  function reviewsPanel() {
    return (
      <div className="panel">
        <h3>Müştəri rəyləri</h3>
        <div className="demo-notice">
          <Star size={15} />
          İnterfeysi nümayiş etdirən nümunə rəylər.
        </div>
        {[
          {
            name: "Aysel M.",
            stars: 5,
            text: "Məhsul çox keyfiyyətlidir. Çatdırılma da gözlədiyimdən tez oldu. Təşəkkürlər!",
            product: "Sony WH-1000XM5 simsiz qulaqlıq",
          },
          {
            name: "Elvin R.",
            stars: 5,
            text: "Şəkildəki kimi gəldi. Paketləmə səliqəli idi, tövsiyə edirəm.",
            product: "Nike Air Force 1 ’07",
          },
        ].map((r) => (
          <div className="review" key={r.name}>
            <div className="review-top">
              <span className="avatar">{r.name[0]}</span>
              <div>
                <strong>{r.name}</strong>
                <div className="stars">{"★".repeat(r.stars)}</div>
              </div>
              <span className="verified">
                <CheckCircle2 size={12} />
                Təsdiqlənmiş alış
              </span>
            </div>
            <small>{r.product}</small>
            <p>{r.text}</p>
            <button
              className="text-link"
              onClick={() => {
                setModal("reply");
              }}
            >
              Cavab yaz
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  }
  function vipPanel() {
    return (
      <>
        <div className="vip-hero">
          <Crown size={30} />
          <h2>
            Daha çox görünürlük.
            <br />
            Daha çox imkan.
          </h2>
          <p>Mağazanızı və məhsullarınızı ön sıraya daşıyın.</p>
        </div>
        <div className="vip-plans">
          {[
            {
              name: "Məhsul VIP",
              price: 9,
              desc: "Bir məhsul üçün 7 gün",
              list: [
                "Axtarışda prioritet",
                "VIP nişanı",
                "Seçilmiş məhsullar bölməsi",
              ],
            },
            {
              name: "Mağaza VIP",
              price: 29,
              desc: "Mağazanız üçün 30 gün",
              list: [
                "Mağazalarda prioritet",
                "VIP mağaza nişanı",
                "Ana səhifədə görünürlük",
              ],
            },
          ].map((p) => (
            <div className="panel" key={p.name}>
              <Crown className="gold" />
              <h3>{p.name}</h3>
              <div className="plan-price">{money(p.price)}</div>
              <p>{p.desc}</p>
              {p.list.map((l) => (
                <p className="plan-feature" key={l}>
                  <Check size={15} />
                  {l}
                </p>
              ))}
              <button
                className="btn full"
                onClick={() =>
                  notify(
                    "Bu frontend demosudur. Ödəniş xidməti hələ qoşulmayıb.",
                  )
                }
              >
                Planı seç
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }
  function exportCSV(items: Product[]) {
    const text =
      "\uFEFFAd,Qiymet,Stok,Kateqoriya\n" +
      items
        .map(
          (p) =>
            `"${p.name.replace(/"/g, '""')}",${p.price},${p.stock},"${p.category}"`,
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "alisveris-mehsullar.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Məhsullar CSV faylına ixrac edildi");
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Əsas məzmuna keç
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>
            <Truck size={14} />
            <span>
              100 ₼-dən yuxarı sifarişlərdə <b>pulsuz çatdırılma</b>
            </span>
          </span>
          <div>
            <button
              onClick={() => {
                setRole("seller");
                setDashboardTab("overview");
                go("dashboard");
              }}
            >
              Satıcı ol
              <ArrowUpRight size={12} />
            </button>
            <i />
            <button onClick={() => setModal("help")}>Yardım mərkəzi</button>
            <i />
            <button onClick={() => setModal("location")}>
              <MapPin size={12} />
              Bakı
              <ChevronDown size={11} />
            </button>
            <button onClick={() => notify("İnterfeys Azərbaycan dilindədir")}>
              AZ
              <ChevronDown size={11} />
            </button>
          </div>
        </div>
      </div>
      <header>
        <div className="container main-header">
          <button
            className="mobile-menu icon-btn"
            aria-label="Menyunu aç"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <button
            className="brand"
            onClick={() => go("home")}
            aria-label="Alisveris.az ana səhifə"
          >
            <span className="brand-symbol">
              <ShoppingBag size={24} />
            </span>
            alışveriş<span className="brand-az">.az</span>
            <span className="brand-dot" />
          </button>
          <div className="search-wrap">
            <form
              className="search-box"
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
            >
              <Search size={20} />
              <input
                type="search"
                aria-label="Məhsul və mağaza axtar"
                placeholder="Nə axtarırsınız? Məhsul, mağaza və daha çox..."
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              <button aria-label="Axtar">
                <Search size={19} />
              </button>
            </form>
            {searchOpen && (
              <>
                <div
                  className="search-dismiss"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="search-results">
                  <div className="search-result-head">
                    <strong>
                      {search
                        ? "Axtarış nəticələri"
                        : recent.length
                          ? "Son axtarışlar"
                          : "Populyar axtarışlar"}
                    </strong>
                    <button
                      className="icon-btn"
                      onClick={() => setSearchOpen(false)}
                      aria-label="Axtarışı bağla"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {!search ? (
                    (recent.length
                      ? recent
                      : ["Qulaqlıq", "Nike", "Kreslo", "Apple Watch"]
                    ).map((q) => (
                      <button
                        className="suggestion"
                        key={q}
                        onClick={() => doSearch(q)}
                      >
                        <Clock size={15} />
                        {q}
                        <ArrowUpRight size={14} />
                      </button>
                    ))
                  ) : (
                    <>
                      {filterProducts(products, {
                        ...defaultFilters,
                        q: search,
                      })
                        .slice(0, 4)
                        .map((p) => (
                          <button
                            className="search-product"
                            key={p.id}
                            onClick={() => {
                              openProduct(p);
                              setSearchOpen(false);
                            }}
                          >
                            <img src={img(p.image)} alt="" />
                            <span>
                              {p.name}
                              <small>{p.store}</small>
                            </span>
                            <strong>{money(p.price)}</strong>
                          </button>
                        ))}
                      {stores
                        .filter((s) =>
                          s.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((s) => (
                          <button
                            className="suggestion"
                            key={s.name}
                            onClick={() => {
                              setStoreName(s.name);
                              go("store");
                            }}
                          >
                            <Store size={16} />
                            {s.name}
                            <small>Mağaza</small>
                          </button>
                        ))}
                      {!filterProducts(products, {
                        ...defaultFilters,
                        q: search,
                      }).length && (
                        <p className="search-empty">
                          Uyğun məhsul tapılmadı. Başqa sözlə axtarın.
                        </p>
                      )}
                      <button className="search-all" onClick={() => doSearch()}>
                        Bütün nəticələrə bax
                        <ArrowRight size={15} />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={() => go("favorites")}
              className={route === "favorites" ? "current" : ""}
            >
              <span>
                <Heart size={22} />
                {favorites.length > 0 && <b>{favorites.length}</b>}
              </span>
              <small>Sevimlilər</small>
            </button>
            <button
              onClick={() => (session ? go("account") : setModal("login"))}
            >
              <User size={22} />
              <small>
                {session ? profile.name.split(" ")[0] || "Hesabım" : "Hesabım"}
              </small>
            </button>
            <div className="header-divider" />
            <button className="cart-trigger" onClick={() => setModal("cart")}>
              <span>
                <ShoppingBag size={23} />
                <b>{cartCount}</b>
              </span>
              <div>
                <small>Səbətim</small>
                <strong>{money(total)}</strong>
              </div>
            </button>
          </div>
        </div>
        <nav className="category-nav" aria-label="Əsas menyu">
          <div className="container nav-inner">
            <button
              className="all-categories"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
            >
              <Grid2X2 size={18} />
              Bütün kateqoriyalar
              <ChevronDown size={14} />
            </button>
            <button
              className={route === "home" ? "active" : ""}
              onClick={() => go("home")}
            >
              Ana səhifə
            </button>
            <button
              className={route === "catalog" ? "active" : ""}
              onClick={() => {
                setFilters(defaultFilters);
                setSearch("");
                go("catalog");
              }}
            >
              Məhsullar
            </button>
            <button
              onClick={() => {
                setFilters({ ...defaultFilters, discount: true });
                go("catalog");
              }}
            >
              <TicketPercent size={16} />
              Endirimlər
              <span className="hot-dot" />
            </button>
            <button
              className={route === "stores" ? "active" : ""}
              onClick={() => go("stores")}
            >
              Mağazalar
            </button>
            <button
              onClick={() => {
                setFilters({ ...defaultFilters, rental: true });
                go("catalog");
              }}
            >
              İcarə
            </button>
            <button
              onClick={() => {
                setFilters({ ...defaultFilters, vip: true });
                go("catalog");
              }}
            >
              <Crown size={15} className="gold" />
              VIP məhsullar
            </button>
            <span className="nav-spacer" />
            <button
              className="new-collection"
              onClick={() => {
                setFilters({ ...defaultFilters, sort: "newest" });
                go("catalog");
              }}
            >
              <span />
              Yeni kəşflər
              <ArrowUpRight size={14} />
            </button>
          </div>
        </nav>
        {menu && (
          <>
            <div className="menu-dismiss" onClick={() => setMenu(false)} />
            <div className="container mega-container">
              <div className="mega-menu">
                <h3>
                  Alış-verişə başla
                  <button
                    className="icon-btn"
                    aria-label="Menyunu bağla"
                    onClick={() => setMenu(false)}
                  >
                    <X size={18} />
                  </button>
                </h3>
                {categories.map((c, i) => {
                  const Icon = categoryIcons[i];
                  return (
                    <button key={c.id} onClick={() => chooseCategory(c.id)}>
                      <Icon size={19} />
                      {c.label}
                      <ChevronRight size={15} />
                    </button>
                  );
                })}
                <hr />
                <button onClick={() => go("stores")}>
                  <Store size={18} />
                  Bütün mağazalar
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={() => {
                    setRole("seller");
                    setDashboardTab("overview");
                    go("dashboard");
                  }}
                >
                  <LayoutDashboard size={18} />
                  Satıcı paneli
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={route === "dashboard" ? "dashboard-page" : ""}
      >
        {route === "home" && (
          <>
            <div className="container">
              <div className="hero-grid">
                <section className={"hero hero-slide-" + heroSlide}>
                  <img
                    className="hero-photo"
                    src={
                      heroSlide === 0
                        ? "/marketplace/images/hero.jpg"
                        : heroSlide === 1
                          ? img("fashion")
                          : img("interior")
                    }
                    alt="Yeni mövsüm üçün qulaqlıq, ayaqqabı və aksesuar kolleksiyası"
                    fetchPriority="high"
                  />
                  <div className="hero-content">
                    <span className="hero-label">
                      <span />
                      YENİ MÖVSÜM. YENİ KƏŞFLƏR.
                    </span>
                    <h1>
                      {heroSlide === 0 ? (
                        <>
                          Hər ehtiyacına
                          <br />
                          bir <em>tapıntı.</em>
                        </>
                      ) : heroSlide === 1 ? (
                        <>
                          Sevdiyin stil.
                          <br />
                          Sənin <em>seçimin.</em>
                        </>
                      ) : (
                        <>
                          Evinə yeni
                          <br />
                          bir <em>nəfəs.</em>
                        </>
                      )}
                    </h1>
                    <p>
                      {heroSlide === 0 ? (
                        <>
                          Sevdiyin məhsullar, etibarlı mağazalar.
                          <br />
                          Hamısı bir ünvanda — alışveriş.az-da.
                        </>
                      ) : heroSlide === 1 ? (
                        "Gündəlik stilini tamamlayan seçilmiş məhsulları kəşf et."
                      ) : (
                        "Kiçik dəyişikliklərlə böyük rahatlıq yarat."
                      )}
                    </p>
                    <button
                      className="btn"
                      onClick={() => {
                        if (heroSlide === 1) chooseCategory("Geyim və moda");
                        else if (heroSlide === 2) chooseCategory("Ev və bağ");
                        else {
                          setFilters(defaultFilters);
                          go("catalog");
                        }
                      }}
                    >
                      İndi kəşf et
                      <ArrowRight size={17} />
                    </button>
                    <div className="hero-dots" aria-label="Kampaniya slaydları">
                      {[0, 1, 2].map((n) => (
                        <button
                          key={n}
                          className={heroSlide === n ? "active" : ""}
                          onClick={() => setHeroSlide(n)}
                          aria-label={`${n + 1}-ci slayd`}
                          aria-pressed={heroSlide === n}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="hero-sticker">
                    <span className="sticker-icon">
                      <ShieldCheck size={20} />
                    </span>
                    <span>
                      Əminliklə seç.<strong>Sevərək istifadə et.</strong>
                    </span>
                  </span>
                </section>
                <section className="side-promo">
                  <span className="eyebrow">HƏFTƏNİN TƏKLİFİ</span>
                  <h2>
                    Səsin ən
                    <br />
                    yaxşı halı.
                  </h2>
                  <p>Seçilmiş qulaqlıqlarda</p>
                  <strong className="discount-number">
                    30%-dək<span>endirim</span>
                  </strong>
                  <img src={img("headphones")} alt="Sony simsiz qulaqlıq" />
                  <button
                    className="circle-arrow"
                    aria-label="Qulaqlıq təkliflərinə bax"
                    onClick={() => {
                      setFilters({
                        ...defaultFilters,
                        category: "Elektronika",
                        discount: true,
                      });
                      go("catalog");
                    }}
                  >
                    <ArrowUpRight size={23} />
                  </button>
                  <span className="promo-note">
                    Yaxşı səs. Daha yaxşı qiymət.
                  </span>
                </section>
              </div>
              <div className="benefits-strip">
                {[
                  [Truck, "Sürətli çatdırılma", "Bütün Azərbaycan üzrə"],
                  [
                    ShieldCheck,
                    "Etibarlı alış-veriş",
                    "Təsdiqlənmiş mağazalar",
                  ],
                  [RotateCcw, "Rahat geri qaytarma", "14 gün ərzində"],
                  [Headphones, "Hər zaman yanınızda", "Dəstək mərkəzi"],
                ].map(([Icon, t, s]) => (
                  <button key={String(t)} onClick={() => setModal("help")}>
                    {typeof Icon !== "string" && <Icon size={25} />}
                    <span>
                      <strong>{String(t)}</strong>
                      <small>{String(s)}</small>
                    </span>
                  </button>
                ))}
              </div>
              <section className="section category-section">
                {heading(
                  "SƏNİN DÜNYAN, SƏNİN SEÇİMİN",
                  "Nə axtarırsınız?",
                  linkAction("Bütün kateqoriyalar", () => {
                    setFilters(defaultFilters);
                    go("catalog");
                  }),
                )}
                <div className="categories-grid">
                  {categories.map((c) => (
                    <button
                      className="category-tile"
                      key={c.id}
                      onClick={() => chooseCategory(c.id)}
                    >
                      <div style={{ background: c.bg }}>
                        <img src={img(c.image)} alt="" loading="lazy" />
                      </div>
                      <strong>{c.label}</strong>
                    </button>
                  ))}
                </div>
              </section>
              <section className="section featured-section">
                {heading(
                  "SEÇİLMİŞ MƏHSULLAR",
                  "Bəyənəcəyinizi düşündük",
                  linkAction("Hamısına bax", () => {
                    setFilters(defaultFilters);
                    go("catalog");
                  }),
                )}
                <div className="section-tabs">
                  <div>
                    <button
                      className={filters.category === "" ? "active" : ""}
                      onClick={() =>
                        setFilters((f) => ({ ...f, category: "" }))
                      }
                    >
                      Sizin üçün
                    </button>
                    {categories.slice(0, 4).map((c) => (
                      <button
                        className={filters.category === c.id ? "active" : ""}
                        key={c.id}
                        onClick={() =>
                          setFilters((f) => ({ ...f, category: c.id }))
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <span>
                    <Crown size={14} />
                    Seçilmiş mağazalardan xüsusi tapıntılar
                  </span>
                </div>
                <div className="products-grid home-products">
                  {(filters.category
                    ? products.filter((p) => p.category === filters.category)
                    : products
                  )
                    .slice(0, 5)
                    .map((p) => (
                      <ProductCard p={p} key={p.id} />
                    ))}
                </div>
              </section>
              <section className="promo-banners">
                <div className="interior-promo">
                  <img
                    src={img("interior")}
                    alt="İşıqlı, rahat və müasir qonaq otağı"
                    loading="lazy"
                  />
                  <div>
                    <span className="eyebrow">EVİNİZƏ YARAŞAN SEÇİMLƏR</span>
                    <h2>
                      Rahatlıq kiçik
                      <br />
                      detallardan başlayır.
                    </h2>
                    <button
                      className="btn light"
                      onClick={() => chooseCategory("Ev və bağ")}
                    >
                      Evin üçün kəşf et
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="style-promo">
                  <span className="eyebrow">ÖZ STİLİNİ TAP</span>
                  <h2>
                    Hər addımda
                    <br />
                    sənə özəl.
                  </h2>
                  <p>Yeni mövsümün favoritləri.</p>
                  <button
                    className="text-link"
                    onClick={() => chooseCategory("Geyim və moda")}
                  >
                    Kolleksiyaya bax
                    <ArrowRight size={16} />
                  </button>
                  <img
                    src={img("sneaker")}
                    alt="Yeni mövsüm idman ayaqqabısı"
                    loading="lazy"
                  />
                </div>
              </section>
              <section className="section">
                {heading(
                  "YAXŞI SEÇİMLƏRİN ÜNVANI",
                  "Seçilmiş mağazalar",
                  linkAction("Bütün mağazalar", () => go("stores")),
                )}
                <div className="store-grid">
                  {stores.map((s) => (
                    <StoreCard
                      key={s.name}
                      s={s}
                      onClick={() => {
                        setStoreName(s.name);
                        go("store");
                      }}
                    />
                  ))}
                </div>
              </section>
              <section className="section">
                {heading(
                  "YENİ GƏLƏNLƏR",
                  "Kəşf etməyə davam edin",
                  linkAction("Bütün məhsullar", () => {
                    setFilters({ ...defaultFilters, sort: "newest" });
                    go("catalog");
                  }),
                )}
                <div className="products-grid home-products">
                  {products.slice(7, 12).map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
              </section>
              <section className="seller-banner">
                <div className="seller-illustration">
                  <Store size={58} strokeWidth={1.2} />
                  <span>
                    <Check size={18} />
                  </span>
                </div>
                <div>
                  <span className="eyebrow">BİRLİKDƏ BÖYÜYƏK</span>
                  <h2>Mağazanızın növbəti ünvanı buradır.</h2>
                  <p>Məhsullarınızı minlərlə yeni alıcı ilə tanış edin.</p>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    setRole("seller");
                    setDashboardTab("overview");
                    go("dashboard");
                  }}
                >
                  Satışa başlayın
                  <ArrowUpRight size={18} />
                </button>
              </section>
            </div>
          </>
        )}
        {route === "catalog" && (
          <div className="container catalog-page">
            <Breadcrumb
              current={filters.category || "Bütün məhsullar"}
              go={go}
            />
            <div className="page-title">
              <div>
                <span className="eyebrow">ÖZÜNÜZ ÜÇÜN KƏŞF EDİN</span>
                <h1>
                  {filters.q
                    ? `“${filters.q}” üçün nəticələr`
                    : filters.category ||
                      (filters.rental && "İcarə məhsulları") ||
                      (filters.discount && "Sərfəli təkliflər") ||
                      "Bütün məhsullar"}
                </h1>
                <p>Gündəlik həyatınıza dəyər qatan seçimlər.</p>
              </div>
              <span className="result-count">{filtered.length} məhsul</span>
            </div>
            <div className="catalog-layout">
              <aside className="filters">
                <div className="filter-title">
                  <SlidersHorizontal size={18} />
                  <h3>Filtrlər</h3>
                </div>
                {filterControls}
              </aside>
              <section>
                <div className="catalog-toolbar">
                  <button
                    className="btn secondary mobile-filter"
                    onClick={() => setFilterDrawer(true)}
                  >
                    <SlidersHorizontal size={16} />
                    Filtrlər
                  </button>
                  <span className="toolbar-count">
                    {filtered.length} məhsul göstərilir
                  </span>
                  <div className="sort-tools">
                    <label>
                      Sıralama:
                      <select
                        value={filters.sort}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, sort: e.target.value }))
                        }
                      >
                        <option value="recommended">Tövsiyə edilən</option>
                        <option value="newest">Ən yeni</option>
                        <option value="price-asc">
                          Qiymət: aşağıdan yuxarı
                        </option>
                        <option value="price-desc">
                          Qiymət: yuxarıdan aşağı
                        </option>
                        <option value="rating">Yüksək reytinq</option>
                      </select>
                    </label>
                    <button
                      aria-label="Kart görünüşü"
                      className={!list ? "active" : ""}
                      onClick={() => setList(false)}
                    >
                      <Grid2X2 size={17} />
                    </button>
                    <button
                      aria-label="Siyahı görünüşü"
                      className={list ? "active" : ""}
                      onClick={() => setList(true)}
                    >
                      <List size={19} />
                    </button>
                  </div>
                </div>
                {Object.entries(filters).some(
                  ([k, v]) => v && k !== "sort",
                ) && (
                  <div className="active-filters">
                    {Object.entries(filters)
                      .filter(([k, v]) => v && k !== "sort")
                      .map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              [k]: defaultFilters[k as keyof Filters],
                            }))
                          }
                        >
                          {typeof v === "boolean"
                            ? {
                                discount: "Endirimli",
                                vip: "VIP",
                                rental: "İcarə",
                                stock: "Stokda",
                              }[k]
                            : k === "min"
                              ? `Min: ${v} ₼`
                              : k === "max"
                                ? `Maks: ${v} ₼`
                                : v}
                          <X size={12} />
                        </button>
                      ))}
                    <button
                      onClick={() => {
                        setFilters(defaultFilters);
                        setSearch("");
                      }}
                    >
                      Hamısını sil
                    </button>
                  </div>
                )}
                {loading ? (
                  <div
                    className="products-grid catalog-products"
                    aria-label="Məhsullar yüklənir"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <div className="skeleton-card" key={n}>
                        <div />
                        <span />
                        <span />
                      </div>
                    ))}
                  </div>
                ) : filtered.length ? (
                  <>
                    <div
                      className={
                        "products-grid catalog-products " +
                        (list ? "list-view" : "")
                      }
                    >
                      {filtered.slice((page - 1) * 9, page * 9).map((p) => (
                        <ProductCard key={p.id} p={p} />
                      ))}
                    </div>
                    <div className="pagination">
                      <span>
                        {(page - 1) * 9 + 1}–
                        {Math.min(page * 9, filtered.length)} /{" "}
                        {filtered.length} məhsul
                      </span>
                      <div>
                        <button
                          disabled={page === 1}
                          onClick={() => {
                            setPage((p) => p - 1);
                            window.scrollTo(0, 250);
                          }}
                          aria-label="Əvvəlki səhifə"
                        >
                          <ChevronLeft size={17} />
                        </button>
                        {Array.from(
                          { length: Math.ceil(filtered.length / 9) },
                          (_, i) => (
                            <button
                              key={i}
                              className={page === i + 1 ? "active" : ""}
                              onClick={() => {
                                setPage(i + 1);
                                window.scrollTo(0, 250);
                              }}
                            >
                              {i + 1}
                            </button>
                          ),
                        )}
                        <button
                          disabled={page === Math.ceil(filtered.length / 9)}
                          onClick={() => {
                            setPage((p) => p + 1);
                            window.scrollTo(0, 250);
                          }}
                          aria-label="Növbəti səhifə"
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <Empty
                    icon={<Search size={38} />}
                    title="Bu dəfə tapılmadı"
                    text="Axtarışı və ya filtrləri dəyişərək yenidən cəhd edin."
                    action={
                      <Button
                        onClick={() => {
                          setFilters(defaultFilters);
                          setSearch("");
                        }}
                      >
                        Bütün məhsulları göstər
                      </Button>
                    }
                  />
                )}
              </section>
            </div>
          </div>
        )}
        {route === "favorites" && (
          <div className="container standard-page">
            <Breadcrumb current="Sevimlilər" go={go} />
            <div className="page-title">
              <div>
                <span className="eyebrow">YENİDƏN SEVMƏK ÜÇÜN</span>
                <h1>
                  Sevimli tapıntılarınız
                  <Heart size={29} />
                </h1>
                <p>Bəyəndiyiniz hər şey, bir yerdə.</p>
              </div>
              <span className="result-count">{favorites.length} məhsul</span>
            </div>
            {favorites.length ? (
              <div className="products-grid">
                {products
                  .filter((p) => favorites.includes(p.id))
                  .map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
              </div>
            ) : (
              <Empty
                icon={<Heart size={42} />}
                title="İlk sevimli tapıntınızı seçin"
                text="Məhsulların üzərindəki ürək işarəsinə toxunun. Bəyəndikləriniz burada saxlanacaq."
                action={
                  <Button onClick={() => go("catalog")}>
                    Məhsulları kəşf et
                    <ArrowRight size={16} />
                  </Button>
                }
              />
            )}
          </div>
        )}
        {(route === "stores" || route === "store") && (
          <div className="container standard-page">
            <Breadcrumb
              current={route === "store" ? storeName || "Mağaza" : "Mağazalar"}
              go={go}
            />
            {route === "stores" ? (
              <>
                <div className="page-title">
                  <div>
                    <span className="eyebrow">
                      SEÇİLMİŞ BRENDLƏR, ETİBARLI ÜNVANLAR
                    </span>
                    <h1>Sevdiyiniz mağazalar burada.</h1>
                    <p>Fərqli seçimlər, ortaq keyfiyyət.</p>
                  </div>
                  <Store size={42} className="muted" />
                </div>
                <div className="store-grid">
                  {stores.map((s) => (
                    <StoreCard
                      key={s.name}
                      s={s}
                      onClick={() => {
                        setStoreName(s.name);
                        go("store");
                      }}
                    />
                  ))}
                </div>
                <div className="seller-banner">
                  <Store size={45} />
                  <div>
                    <h2>Sizin mağazanız da burada olsun.</h2>
                    <p>ALISVERIS.AZ ilə yeni müştərilərə çatın.</p>
                  </div>
                  <Button
                    onClick={() => {
                      setRole("seller");
                      go("dashboard");
                    }}
                  >
                    Satıcı panelinə bax
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="store-hero">
                  <div className="store-hero-cover">
                    <span>YAXŞI SEÇİMLƏR BURADAN BAŞLAYIR.</span>
                  </div>
                  <div className="store-hero-info">
                    <span
                      className="store-logo"
                      style={{
                        background:
                          stores.find((s) => s.name === storeName)?.color ||
                          "#17634b",
                      }}
                    >
                      {stores.find((s) => s.name === storeName)?.logo ||
                        storeName?.slice(0, 2)}
                    </span>
                    <div>
                      <h1>
                        {storeName || "TechZone"}
                        <ShieldCheck size={23} />
                        <span className="badge vip">
                          <Crown size={12} />
                          VIP MAĞAZA
                        </span>
                      </h1>
                      <p>
                        {stores.find((s) => s.name === storeName)?.tag ||
                          "Seçilmiş məhsulların ünvanı"}
                      </p>
                      <div className="store-meta">
                        <span>
                          <Star size={14} fill="currentColor" />
                          4.9
                        </span>
                        <small>
                          {
                            products.filter(
                              (p) => p.store === (storeName || "TechZone"),
                            ).length
                          }{" "}
                          məhsul
                        </small>
                        <small>
                          <MapPin size={13} />
                          Bakı, Azərbaycan
                        </small>
                      </div>
                    </div>
                    <Button
                      secondary
                      onClick={() => {
                        setModal("");
                        setAccountTab("messages");
                        go("account");
                      }}
                    >
                      <MessageCircle size={16} />
                      Mesaj göndər
                    </Button>
                  </div>
                </div>
                <div className="store-tabs">
                  <button className="active">Məhsullar</button>
                  <button onClick={() => setModal("store-info")}>
                    Mağaza haqqında
                  </button>
                  <button
                    onClick={() => {
                      setAccountTab("reviews");
                      go("account");
                    }}
                  >
                    Rəylər
                  </button>
                </div>
                <div className="products-grid">
                  {products
                    .filter((p) => p.store === (storeName || "TechZone"))
                    .map((p) => (
                      <ProductCard key={p.id} p={p} />
                    ))}
                </div>
              </>
            )}
          </div>
        )}
        {route === "checkout" && (
          <div className="container standard-page checkout-page">
            <Breadcrumb current="Sifarişi tamamla" go={go} />
            <div className="checkout-title">
              <h1>Sifarişi tamamlayaq.</h1>
              <span>
                <LockKeyhole size={15} />
                Demo checkout
              </span>
            </div>
            {cart.length ? (
              <form
                className="checkout-layout"
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  if (checkoutBusy) return;
                  setCheckoutBusy(true);
                  const fd = new FormData(e.currentTarget);
                  const o: Order = {
                    id: "AZ-" + Date.now().toString().slice(-7),
                    date: new Date().toISOString(),
                    items: cart.map((c) => {
                      const p = products.find((x) => x.id === c.id)!;
                      return {
                        ...c,
                        price: p.price,
                        name: p.name,
                        store: p.store,
                      };
                    }),
                    total:
                      total * (discount ? 0.9 : 1) + (total >= 100 ? 0 : 5),
                    name: String(fd.get("name")),
                    phone: String(fd.get("phone")),
                    address: String(fd.get("address")),
                    status: "Gözləyir",
                  };
                  setOrders((a) => [o, ...a]);
                  setProducts((a) =>
                    a.map((p) => ({
                      ...p,
                      stock:
                        p.stock -
                        (cart.find((c) => c.id === p.id)?.quantity || 0),
                    })),
                  );
                  setOrderDone(o);
                  setCart([]);
                  setCheckoutBusy(false);
                  go("success");
                }}
              >
                <div>
                  <div className="panel">
                    <div className="step-title">
                      <span>1</span>
                      <h3>Əlaqə məlumatları</h3>
                    </div>
                    <div className="form-grid">
                      <label>
                        Ad və soyad
                        <input
                          name="name"
                          required
                          autoComplete="name"
                          defaultValue={profile.name}
                          placeholder="Adınızı və soyadınızı daxil edin"
                        />
                      </label>
                      <label>
                        Telefon nömrəsi
                        <input
                          name="phone"
                          required
                          type="tel"
                          autoComplete="tel"
                          placeholder="+994 50 000 00 00"
                          defaultValue={profile.phone}
                          minLength={9}
                        />
                      </label>
                      <label className="span-2">
                        E-poçt ünvanı
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          defaultValue={profile.email}
                          placeholder="siz@example.com"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="step-title">
                      <span>2</span>
                      <h3>Çatdırılma ünvanı</h3>
                    </div>
                    <div className="form-grid">
                      <label>
                        Şəhər
                        <select name="city">
                          <option>Bakı</option>
                          <option>Sumqayıt</option>
                          <option>Gəncə</option>
                          <option>Digər şəhər</option>
                        </select>
                      </label>
                      <label>
                        Ünvan növü
                        <select>
                          <option>Ev</option>
                          <option>İş yeri</option>
                        </select>
                      </label>
                      <label className="span-2">
                        Tam ünvan
                        <input
                          name="address"
                          required
                          autoComplete="street-address"
                          defaultValue={profile.address}
                          placeholder="Küçə, bina, mənzil"
                          minLength={5}
                        />
                      </label>
                      <label className="span-2">
                        Sifariş qeydi{" "}
                        <span className="muted">(istəyə bağlı)</span>
                        <textarea
                          name="note"
                          placeholder="Çatdırılma üçün əlavə məlumat..."
                        />
                      </label>
                    </div>
                    <label className="delivery-option">
                      <input type="radio" defaultChecked name="delivery" />
                      <Truck size={23} />
                      <span>
                        <strong>Standart çatdırılma</strong>
                        <small>1–3 iş günü ərzində</small>
                      </span>
                      <strong>{total >= 100 ? "Pulsuz" : money(5)}</strong>
                    </label>
                  </div>
                  <div className="panel">
                    <div className="step-title">
                      <span>3</span>
                      <h3>Ödəniş üsulu</h3>
                    </div>
                    <label className="delivery-option">
                      <input type="radio" name="payment" defaultChecked />
                      <Wallet size={22} />
                      <span>
                        <strong>Qapıda nağd ödəniş</strong>
                        <small>Demo sifariş — real ödəniş tutulmur</small>
                      </span>
                      <CheckCircle2 size={19} />
                    </label>
                    <div className="demo-notice">
                      <LockKeyhole size={15} />
                      Kart ödənişi bu dizayn versiyasına qoşulmayıb.
                    </div>
                  </div>
                </div>
                <aside className="panel checkout-summary">
                  <h3>Sifarişiniz</h3>
                  {cart.map((c) => {
                    const p = products.find((x) => x.id === c.id)!;
                    return (
                      <div className="checkout-item" key={p.id}>
                        <img src={img(p.image)} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.store} · {c.quantity} ədəd
                          </small>
                        </div>
                        <b>{money(p.price * c.quantity)}</b>
                      </div>
                    );
                  })}
                  <div className="coupon">
                    <input
                      aria-label="Endirim kodu"
                      placeholder="Endirim kodunuz var?"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (coupon.toUpperCase() === "DEMO10") {
                          setDiscount(true);
                          notify("10% demo endirim tətbiq edildi");
                        } else
                          notify(
                            "Kod tapılmadı. Demo üçün DEMO10 istifadə edin.",
                          );
                      }}
                    >
                      Tətbiq et
                    </button>
                  </div>
                  <div className="summary-row">
                    <span>Məhsullar</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Çatdırılma</span>
                    <strong className="green">
                      {total >= 100 ? "Pulsuz" : money(5)}
                    </strong>
                  </div>
                  {discount && (
                    <div className="summary-row">
                      <span>Endirim (10%)</span>
                      <strong className="green">−{money(total * 0.1)}</strong>
                    </div>
                  )}
                  <div className="summary-row total-row">
                    <span>Yekun məbləğ</span>
                    <strong>
                      {money(
                        total * (discount ? 0.9 : 1) + (total >= 100 ? 0 : 5),
                      )}
                    </strong>
                  </div>
                  <label className="check-label terms">
                    <input type="checkbox" required />
                    Demo sifariş şərtləri ilə razıyam. Real sifariş
                    verilməyəcəyini anlayıram.
                  </label>
                  <button
                    className="btn full"
                    type="submit"
                    disabled={checkoutBusy}
                  >
                    Demo sifarişi təsdiqlə
                    <ArrowRight size={17} />
                  </button>
                  <span className="secure-note">
                    <ShieldCheck size={15} />
                    Məlumatlarınız bu brauzerdə qalır
                  </span>
                </aside>
              </form>
            ) : (
              <Empty
                title="Səbətiniz boşdur"
                text="Sifarişi tamamlamaq üçün əvvəlcə məhsul seçin."
                action={
                  <Button onClick={() => go("catalog")}>
                    Alış-verişə başla
                  </Button>
                }
              />
            )}
          </div>
        )}
        {route === "success" && (
          <div className="container success-page">
            <span className="success-icon">
              <Check size={40} />
            </span>
            <span className="eyebrow">TƏŞƏKKÜR EDİRİK!</span>
            <h1>Gözəl seçiminiz var.</h1>
            <p>
              Demo sifarişiniz uğurla yaradıldı.
              <br />
              Real sifariş və ödəniş həyata keçirilməyib.
            </p>
            {orderDone && (
              <div className="success-order">
                <div>
                  <span>Sifariş nömrəsi</span>
                  <strong>#{orderDone.id}</strong>
                </div>
                <div>
                  <span>Ümumi məbləğ</span>
                  <strong>{money(orderDone.total)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <span className="status">{orderDone.status}</span>
                </div>
              </div>
            )}
            <div className="button-row">
              <Button
                onClick={() => {
                  setAccountTab("orders");
                  go("account");
                }}
              >
                Sifarişlərimə bax
                <ArrowRight size={16} />
              </Button>
              <Button secondary onClick={() => go("home")}>
                Alış-verişə davam et
              </Button>
            </div>
          </div>
        )}
        {route === "dashboard" && (
          <div className="container">{dashboard()}</div>
        )}
        {route === "account" && (
          <div className="container standard-page">
            <Breadcrumb current="Şəxsi kabinet" go={go} />
            <div className="page-title">
              <div>
                <span className="eyebrow">ŞƏXSİ KABİNET</span>
                <h1>
                  Salam, {profile.name.split(" ")[0] || "xoş gəlmisiniz"}
                  <span className="wave">✦</span>
                </h1>
                <p>Alış-verişinizin bütün detalları bir yerdə.</p>
              </div>
              <span className="status">Demo hesab</span>
            </div>
            <div className="account-layout">
              <aside className="account-nav">
                {[
                  ["overview", "Ümumi icmal", LayoutDashboard],
                  ["profile", "Profil məlumatları", User],
                  ["orders", "Sifarişlərim", ShoppingBag],
                  ["favorites", "Sevimlilər", Heart],
                  ["addresses", "Ünvanlarım", MapPin],
                  ["messages", "Mesajlar", MessageCircle],
                  ["notifications", "Bildirişlər", Bell],
                  ["reviews", "Rəylərim", Star],
                  ["security", "Təhlükəsizlik", LockKeyhole],
                ].map(([k, t, Icon]) => (
                  <button
                    key={String(k)}
                    className={accountTab === k ? "active" : ""}
                    onClick={() =>
                      k === "favorites"
                        ? go("favorites")
                        : setAccountTab(String(k))
                    }
                  >
                    {typeof Icon !== "string" && <Icon size={18} />}
                    <span>{String(t)}</span>
                  </button>
                ))}
                <button
                  className="danger"
                  onClick={() => {
                    setSession(false);
                    go("home");
                    notify("Hesabdan çıxış edildi");
                  }}
                >
                  <LogOut size={18} />
                  Çıxış
                </button>
              </aside>
              <div className="account-content">
                {accountTab === "overview" && (
                  <>
                    <div className="stats-grid">
                      {[
                        [ShoppingBag, orders.length, "Sifarişlərim", "orders"],
                        [Heart, favorites.length, "Sevimlilər", "favorites"],
                        [
                          MessageCircle,
                          messages.length,
                          "Mesajlar",
                          "messages",
                        ],
                      ].map(([Icon, n, t, k]) => (
                        <button
                          className="stat-card"
                          key={String(t)}
                          onClick={() =>
                            k === "favorites"
                              ? go("favorites")
                              : setAccountTab(String(k))
                          }
                        >
                          {typeof Icon !== "string" &&
                            typeof Icon !== "number" && <Icon size={23} />}
                          <strong>{String(n)}</strong>
                          <span>{String(t)}</span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    </div>
                    <div className="panel">
                      <h3>Son sifarişlərim</h3>
                      {buyerOrders()}
                    </div>
                  </>
                )}
                {accountTab === "profile" && (
                  <div className="panel">
                    <h3>Profil məlumatları</h3>
                    <form
                      className="form-grid"
                      onSubmit={(e) => {
                        e.preventDefault();
                        notify("Profil məlumatları saxlanıldı");
                      }}
                    >
                      <Field
                        label="Ad və soyad"
                        value={profile.name}
                        onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                      />
                      <Field
                        label="E-poçt ünvanı"
                        value={profile.email}
                        type="email"
                        onChange={(v) =>
                          setProfile((p) => ({ ...p, email: v }))
                        }
                      />
                      <Field
                        label="Telefon"
                        value={profile.phone}
                        type="tel"
                        onChange={(v) =>
                          setProfile((p) => ({ ...p, phone: v }))
                        }
                      />
                      <Field
                        label="Əsas ünvan"
                        value={profile.address}
                        onChange={(v) =>
                          setProfile((p) => ({ ...p, address: v }))
                        }
                      />
                      <div className="span-2">
                        <button className="btn" type="submit">
                          Dəyişiklikləri saxla
                          <Check size={16} />
                        </button>
                      </div>
                    </form>
                    <hr />
                    <h3>Bildiriş ayarları</h3>
                    {[
                      "Sifariş statusları haqqında e-poçt",
                      "Kampaniya və yeni məhsullar",
                      "Yeni mesaj bildirişləri",
                    ].map((t) => (
                      <Toggle label={t} key={t} />
                    ))}
                  </div>
                )}
                {accountTab === "orders" && (
                  <div className="panel">
                    <h3>Sifariş tarixçəsi</h3>
                    {buyerOrders()}
                  </div>
                )}
                {accountTab === "addresses" && (
                  <div className="panel">
                    <div className="panel-heading">
                      <h3>Ünvanlarım</h3>
                      <button
                        className="btn secondary"
                        onClick={() => setModal("address")}
                      >
                        <Plus size={16} />
                        Ünvan əlavə et
                      </button>
                    </div>
                    {addresses.length ? (
                      addresses.map((a, i) => (
                        <div className="address-card" key={i}>
                          <MapPin size={22} />
                          <div>
                            <strong>
                              {i === 0 ? "Əsas ünvan" : "Ünvan " + (i + 1)}
                            </strong>
                            <p>{a}</p>
                          </div>
                          <button
                            className="icon-btn danger"
                            aria-label="Ünvanı sil"
                            onClick={() =>
                              setAddresses((x) => x.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <Empty
                        icon={<MapPin size={35} />}
                        title="İlk ünvanınızı əlavə edin"
                        text="Növbəti sifarişlərinizi daha rahat tamamlayın."
                        action={
                          <Button onClick={() => setModal("address")}>
                            Ünvan əlavə et
                          </Button>
                        }
                      />
                    )}
                  </div>
                )}
                {accountTab === "messages" && messagePanel()}
                {accountTab === "notifications" && (
                  <div className="panel">{notifications}</div>
                )}
                {accountTab === "reviews" && reviewsPanel()}
                {accountTab === "security" && (
                  <div className="panel">
                    <h3>Təhlükəsizlik ayarları</h3>
                    <div className="demo-notice">
                      <ShieldCheck size={18} />
                      Bu frontend demosudur. Real autentifikasiya və şifrə
                      dəyişmə backend qoşulduqdan sonra aktiv olacaq.
                    </div>
                    <form
                      className="form-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        notify(
                          "Bu dizayn demosunda şifrə saxlanılmır və dəyişdirilmir.",
                        );
                      }}
                    >
                      <label>
                        Cari şifrə
                        <input
                          type="password"
                          autoComplete="current-password"
                          required
                          minLength={8}
                        />
                      </label>
                      <label>
                        Yeni şifrə
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={8}
                        />
                      </label>
                      <button className="btn">Şifrəni yenilə</button>
                    </form>
                    <hr />
                    <Toggle label="Bütün cihazlarda giriş bildirişləri" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <section className="newsletter">
        <div className="container newsletter-inner">
          <div className="newsletter-icon">
            <Mail size={29} />
          </div>
          <div>
            <h2>Yaxşı təkliflərdən ilk siz xəbər tutun.</h2>
            <p>Yeni məhsullar, xüsusi endirimlər və daha çoxu.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              notify(
                "Təşəkkürlər! Demo abunəliyiniz bu brauzerdə qeydə alındı.",
              );
              saveState("newsletter", true);
              e.currentTarget.reset();
            }}
          >
            <input
              type="email"
              required
              aria-label="Bülleten üçün e-poçt"
              placeholder="E-poçt ünvanınız"
            />
            <button>
              Abunə ol
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <button className="brand" onClick={() => go("home")}>
                <span className="brand-symbol">
                  <ShoppingBag size={22} />
                </span>
                alışveriş<span className="brand-az">.az</span>
              </button>
              <p>
                Sevdiyiniz məhsullar, etibarlı mağazalar.
                <br />
                Azərbaycanın alış-veriş məkanı.
              </p>
              <div className="socials">
                {["Instagram", "Facebook", "TikTok"].map((s, i) => (
                  <button
                    aria-label={s}
                    key={s}
                    onClick={() => notify(s + " səhifəsi hələ əlavə edilməyib")}
                  >
                    {["ig", "f", "tk"][i]}
                  </button>
                ))}
              </div>
            </div>
            {[
              {
                title: "Kəşf edin",
                links: [
                  "Bütün məhsullar",
                  "Mağazalar",
                  "Endirimlər",
                  "İcarə məhsulları",
                ],
              },
              {
                title: "Alıcılar üçün",
                links: [
                  "Sifarişlərim",
                  "Çatdırılma",
                  "Geri qaytarma",
                  "Yardım mərkəzi",
                ],
              },
              {
                title: "Satıcılar üçün",
                links: [
                  "Satıcı olun",
                  "Satıcı paneli",
                  "VIP xidmətləri",
                  "Əməkdaşlıq",
                ],
              },
            ].map((g) => (
              <div className="footer-links" key={g.title}>
                <h4>{g.title}</h4>
                {g.links.map((l, i) => (
                  <button
                    key={l}
                    onClick={() => {
                      if (g.title === "Kəşf edin") {
                        setFilters({
                          ...defaultFilters,
                          ...(i === 2
                            ? { discount: true }
                            : i === 3
                              ? { rental: true }
                              : {}),
                        });
                        go(i === 1 ? "stores" : "catalog");
                      } else if (g.title === "Satıcılar üçün") {
                        setRole("seller");
                        setDashboardTab(i === 2 ? "vip" : "overview");
                        go("dashboard");
                      } else if (i === 0) {
                        setAccountTab("orders");
                        go("account");
                      } else setModal("help");
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            ))}
            <div className="footer-contact">
              <h4>Bizimlə əlaqə</h4>
              <button onClick={() => setModal("help")}>
                <Headphones size={17} />
                Dəstək mərkəzi
                <ArrowUpRight size={13} />
              </button>
              <p>
                <Clock size={15} />
                Hər gün, 09:00–21:00
              </p>
              <span className="made-in">
                <span>🇦🇿</span>Azərbaycanda, sizin üçün.
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 ALISVERIS.AZ. Bütün hüquqlar qorunur.</span>
            <div>
              <button onClick={() => setModal("terms")}>
                İstifadəçi razılaşması
              </button>
              <button onClick={() => setModal("privacy")}>
                Məxfilik siyasəti
              </button>
              <span className="payment-label">
                VISA <b>●●</b>
              </span>
            </div>
          </div>
          <div className="demo-toolbar">
            <span>
              <Eye size={13} />
              Frontend demo
            </span>
            <div>
              <span>Baxış rejimi:</span>
              <select
                aria-label="Demo rolunu seç"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setDashboardTab("overview");
                  if (e.target.value === "buyer") go("home");
                  else go("dashboard");
                }}
              >
                <option value="buyer">Alıcı</option>
                <option value="seller">Satıcı</option>
                <option value="admin">Administrator</option>
                <option value="radmin">RAdmin</option>
              </select>
            </div>
          </div>
        </div>
      </footer>
      <nav className="mobile-bottom" aria-label="Mobil naviqasiya">
        <button
          className={route === "home" ? "active" : ""}
          onClick={() => go("home")}
        >
          <Home size={21} />
          <span>Ana səhifə</span>
        </button>
        <button
          className={route === "catalog" ? "active" : ""}
          onClick={() => go("catalog")}
        >
          <Grid2X2 size={21} />
          <span>Kataloq</span>
        </button>
        <button onClick={() => go("favorites")}>
          <Heart size={21} />
          <span>Sevimlilər</span>
        </button>
        <button onClick={() => setModal("cart")}>
          <span className="mobile-cart">
            <ShoppingBag size={21} />
            {cartCount > 0 && <b>{cartCount}</b>}
          </span>
          <span>Səbət</span>
        </button>
        <button onClick={() => (session ? go("account") : setModal("login"))}>
          <User size={21} />
          <span>Hesabım</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Bildirişi bağla">
            <X size={15} />
          </button>
        </div>
      )}
      {filterDrawer && (
        <Modal title="Filtrlər" onClose={() => setFilterDrawer(false)} drawer>
          <div className="mobile-filters-content">{filterControls}</div>
          <button className="btn full" onClick={() => setFilterDrawer(false)}>
            {filtered.length} məhsulu göstər
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === "cart" && (
        <Modal
          title={`Səbətim (${cartCount})`}
          drawer
          onClose={() => setModal("")}
        >
          {cartContent()}
        </Modal>
      )}
      {modal === "product" && selected && (
        <Modal title="Məhsul haqqında" wide onClose={() => setModal("")}>
          <ProductDetail
            p={selected}
            favorite={() => favorite(selected.id)}
            isFavorite={favorites.includes(selected.id)}
            addCart={(q) => addCart(selected, q)}
            notify={notify}
            onStore={() => {
              setStoreName(selected.store);
              setModal("");
              go("store");
            }}
            onMessage={() => {
              setModal("");
              setAccountTab("messages");
              go("account");
            }}
          />
        </Modal>
      )}
      {["login", "register", "forgot"].includes(modal) && (
        <Modal
          title={
            modal === "register"
              ? "ALISVERIS.AZ-a xoş gəlmisiniz"
              : modal === "forgot"
                ? "Şifrəni bərpa et"
                : "Yenidən xoş gördük!"
          }
          onClose={() => setModal("")}
        >
          <div className="auth-intro">
            <span className="brand-symbol">
              <ShoppingBag size={28} />
            </span>
            <p>
              {modal === "register"
                ? "Yeni tapıntılar üçün ilk addımı atın."
                : modal === "forgot"
                  ? "E-poçt ünvanınızı daxil edin."
                  : "Sevimli tapıntılarınıza bir addım qaldı."}
            </p>
          </div>
          <div className="demo-notice">
            <Eye size={15} />
            Demo giriş. Real hesab yaradılmır, şifrə saxlanılmır.
          </div>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (modal === "forgot") {
                notify("Demo versiyada bərpa e-poçtu göndərilmir.");
                setModal("login");
                return;
              }
              setProfile((p) => ({
                ...p,
                name: String(f.get("name") || p.name || "Alıcı"),
                email: String(f.get("email")),
                phone: String(f.get("phone") || p.phone),
              }));
              setSession(true);
              setModal("");
              notify("Demo hesabınıza xoş gəlmisiniz!");
              if (f.get("role") === "seller") {
                setRole("seller");
                go("dashboard");
              } else go("account");
            }}
          >
            {modal === "register" && (
              <>
                <div className="account-type">
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="buyer"
                      defaultChecked
                    />
                    Alıcı hesabı
                  </label>
                  <label>
                    <input type="radio" name="role" value="seller" />
                    Satıcı hesabı
                  </label>
                </div>
                <label>
                  Ad və soyad
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Ad və soyadınız"
                  />
                </label>
                <label>
                  Telefon
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+994 50 000 00 00"
                  />
                </label>
              </>
            )}
            <label>
              E-poçt ünvanı
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="siz@example.com"
              />
            </label>
            {modal !== "forgot" && (
              <label>
                Şifrə
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={
                    modal === "register" ? "new-password" : "current-password"
                  }
                  placeholder="Ən azı 8 simvol"
                />
              </label>
            )}
            {modal === "login" && (
              <button
                className="text-link right"
                type="button"
                onClick={() => setModal("forgot")}
              >
                Şifrənizi unutmusunuz?
              </button>
            )}
            {modal === "register" && (
              <label className="check-label terms">
                <input type="checkbox" required />
                Demo istifadə şərtləri və məxfilik məlumatları ilə razıyam.
              </label>
            )}
            <button className="btn full">
              {modal === "register"
                ? "Demo hesab yarat"
                : modal === "forgot"
                  ? "Bərpa keçidi göndər"
                  : "Demo giriş et"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-switch">
            {modal === "login" ? "Hesabınız yoxdur?" : "Artıq hesabınız var?"}
            <button
              onClick={() => setModal(modal === "login" ? "register" : "login")}
            >
              {modal === "login" ? "Qeydiyyatdan keçin" : "Giriş edin"}
            </button>
          </div>
        </Modal>
      )}
      {modal === "edit-product" && (
        <Modal
          title={editProduct ? "Məhsulu redaktə et" : "Yeni məhsul əlavə et"}
          wide
          onClose={() => setModal("")}
        >
          <ProductForm
            product={editProduct}
            onSave={(p) => {
              setProducts((a) =>
                editProduct ? a.map((x) => (x.id === p.id ? p : x)) : [p, ...a],
              );
              setModal("");
              notify("Məhsul saxlanıldı");
            }}
          />
        </Modal>
      )}
      {modal === "delete-product" && editProduct && (
        <Modal title="Məhsulu sil" onClose={() => setModal("")}>
          <p>“{editProduct.name}” məhsulunu silmək istəyirsiniz?</p>
          <p className="muted">
            Dəyişiklik yalnız bu demo brauzerində tətbiq edilir.
          </p>
          <div className="button-row">
            <Button secondary onClick={() => setModal("")}>
              Geri qayıt
            </Button>
            <button
              className="btn danger-bg"
              onClick={() => {
                setProducts((a) => a.filter((p) => p.id !== editProduct.id));
                setCart((a) => a.filter((p) => p.id !== editProduct.id));
                setFavorites((a) => a.filter((x) => x !== editProduct.id));
                setModal("");
                notify("Məhsul silindi");
              }}
            >
              Məhsulu sil
            </button>
          </div>
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Toplu məhsul importu" wide onClose={() => setModal("")}>
          <ImportProducts
            onImport={(p) => {
              setProducts((a) => [...p, ...a]);
              setModal("");
              notify(`${p.length} məhsul import edildi`);
            }}
          />
        </Modal>
      )}
      {modal === "address" && (
        <Modal title="Yeni ünvan" onClose={() => setModal("")}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setAddresses((a) => [
                ...a,
                String(fd.get("city")) + ", " + String(fd.get("address")),
              ]);
              setModal("");
              notify("Yeni ünvan əlavə edildi");
            }}
          >
            <label>
              Şəhər
              <select name="city">
                <option>Bakı</option>
                <option>Sumqayıt</option>
                <option>Gəncə</option>
              </select>
            </label>
            <label>
              Tam ünvan
              <textarea
                name="address"
                required
                minLength={5}
                placeholder="Küçə, bina, mənzil"
              />
            </label>
            <button className="btn">
              Ünvanı saxla
              <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "order-detail" && orderDone && (
        <Modal title={"Sifariş #" + orderDone.id} onClose={() => setModal("")}>
          <span className="status">{orderDone.status}</span>
          <p>
            <strong>{orderDone.name}</strong>
            <br />
            {orderDone.phone}
            <br />
            {orderDone.address}
          </p>
          {orderDone.items.map((i) => (
            <div className="summary-row" key={i.id}>
              <span>
                {i.name} × {i.quantity}
                <small className="block muted">{i.store}</small>
              </span>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>
          ))}
          <hr />
          <div className="summary-row">
            <span>Yekun</span>
            <strong>{money(orderDone.total)}</strong>
          </div>
        </Modal>
      )}
      {modal === "reply" && (
        <Modal title="Rəyə cavab ver" onClose={() => setModal("")}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              setModal("");
              notify("Demo cavabınız saxlanıldı");
            }}
          >
            <label>
              Cavabınız
              <textarea required placeholder="Müştəriyə cavabınızı yazın..." />
            </label>
            <button className="btn">
              Cavabı göndər
              <Send size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "location" && (
        <Modal title="Çatdırılma şəhəri" onClose={() => setModal("")}>
          <p>Məhsulları çatdırılma ünvanınıza uyğun kəşf edin.</p>
          {["Bakı", "Sumqayıt", "Gəncə", "Digər şəhərlər"].map((s) => (
            <button
              className="location-option"
              key={s}
              onClick={() => {
                setModal("");
                notify("Çatdırılma şəhəri: " + s);
              }}
            >
              <MapPin size={19} />
              {s}
              <ChevronRight size={16} />
            </button>
          ))}
        </Modal>
      )}
      {modal === "store-info" && (
        <Modal
          title={storeName || "Mağaza haqqında"}
          onClose={() => setModal("")}
        >
          <p>{stores.find((s) => s.name === storeName)?.tag}</p>
          <p>Gündəlik həyat üçün diqqətlə seçilmiş məhsullar.</p>
          <div className="info-line">
            <MapPin />
            Bakı, Azərbaycan
          </div>
          <div className="info-line">
            <Clock />
            {storeProfile.hours}
          </div>
          <div className="info-line">
            <Truck />
            {storeProfile.delivery}
          </div>
          <div className="demo-notice">
            Bu mağaza frontend dizaynı üçün nümunədir.
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Sizə necə kömək edə bilərik?"
          onClose={() => setModal("")}
        >
          <div className="help-intro">
            <Headphones size={38} />
            <p>Hər alış-verişdə yanınızdayıq.</p>
          </div>
          {[
            {
              q: "Çatdırılma necə həyata keçirilir?",
              a: "Nümunə dizaynda standart çatdırılma 1–3 iş günü kimi göstərilir. 100 ₼-dən yuxarı demo sifarişlərdə çatdırılma pulsuz hesablanır.",
            },
            {
              q: "Məhsulu necə geri qaytara bilərəm?",
              a: "Geri qaytarma bölməsi dizaynda 14 günlük nümunə qayda ilə göstərilib. Real satış və geri qaytarma prosesi hələ aktiv deyil.",
            },
            {
              q: "Satıcı hesabını necə aça bilərəm?",
              a: "“Satıcı ol” düyməsi ilə demo panelə keçin. Məhsul əlavə etmə və mağaza idarəetmə dizaynını sınayın.",
            },
            {
              q: "Bu saytda real sifariş verə bilərəm?",
              a: "Hazırda frontend demo versiyasıdır. Sifarişlər bu brauzerdə saxlanılır. Ödəniş və satıcıya göndərilmə baş vermir.",
            },
          ].map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <Plus size={16} />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Modal>
      )}
      {(modal === "terms" || modal === "privacy") && (
        <Modal
          title={
            modal === "terms"
              ? "İstifadəçi razılaşması"
              : "Məxfilik məlumatları"
          }
          onClose={() => setModal("")}
        >
          <div className="legal-copy">
            <span className="badge">Frontend demo</span>
            <h3>
              {modal === "terms"
                ? "Demo istifadə şərtləri"
                : "Bu dizayn versiyasında məlumatlar"}
            </h3>
            <p>
              Bu sayt ALISVERIS.AZ marketplace interfeysinin nümayiş
              versiyasıdır. Məhsullar, qiymətlər, mağazalar və rəylər nümunə
              kimi göstərilir.
            </p>
            <p>
              Səbət, sevimlilər, demo profil və sifariş məlumatları
              brauzerinizin lokal yaddaşında saxlanılır. Real hesab, sifariş və
              ödəniş yaradılmır.
            </p>
            <p>
              Demo formalarına həqiqi şifrənizi və həssas şəxsi məlumatlarınızı
              daxil etməyin. Şifrə sahələri dizayn üçündür və saxlanılmır.
            </p>
            <p>
              Canlı platforma üçün yekun istifadə şərtləri və məxfilik siyasəti
              ayrıca hazırlanmalıdır.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
  function buyerOrders() {
    return orders.length ? (
      <div className="buyer-orders">
        {orders.map((o) => (
          <div className="buyer-order" key={o.id}>
            <div className="panel-heading">
              <strong>#{o.id}</strong>
              <span className="status">{o.status}</span>
            </div>
            <p>
              {new Date(o.date).toLocaleDateString("az-AZ")} · {o.items.length}{" "}
              məhsul
            </p>
            <div className="summary-row">
              <strong>{money(o.total)}</strong>
              <button
                className="text-link"
                onClick={() => {
                  setOrderDone(o);
                  setModal("order-detail");
                }}
              >
                Ətraflı
                <ArrowRight size={14} />
              </button>
            </div>
            {o.status === "Gözləyir" && (
              <button
                className="text-link danger"
                onClick={() => {
                  setOrders((a) =>
                    a.map((x) =>
                      x.id === o.id ? { ...x, status: "Ləğv edildi" } : x,
                    ),
                  );
                  setProducts((a) =>
                    a.map((p) => ({
                      ...p,
                      stock:
                        p.stock +
                        (o.items.find((i) => i.id === p.id)?.quantity || 0),
                    })),
                  );
                  notify("Sifariş ləğv edildi");
                }}
              >
                Sifarişi ləğv et
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <Empty
        title="Hələ sifarişiniz yoxdur"
        text="İlk tapıntınızı seçin və demo alış-verişi sınayın."
        action={
          <Button onClick={() => go("catalog")}>Məhsulları kəşf et</Button>
        }
      />
    );
  }
}
function Breadcrumb({
  current,
  go,
}: {
  current: string;
  go: (r: string) => void;
}) {
  return (
    <nav className="breadcrumb" aria-label="Səhifə yolu">
      <button onClick={() => go("home")}>
        <Home size={13} />
        Ana səhifə
      </button>
      <ChevronRight size={12} />
      <span>{current}</span>
    </nav>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}
function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(() => readState("toggle-" + label, true));
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={"toggle " + (on ? "on" : "")}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => {
          setOn(!on);
          saveState("toggle-" + label, !on);
        }}
      >
        <i />
      </button>
    </label>
  );
}
function StoreCard({
  s,
  onClick,
}: {
  s: (typeof stores)[number];
  onClick: () => void;
}) {
  return (
    <article className="store-card">
      <button
        className="store-cover"
        style={{ background: s.color + "12" }}
        onClick={onClick}
        aria-label={s.name + " mağazasına bax"}
      >
        <span className="store-logo" style={{ background: s.color }}>
          {s.logo}
        </span>
        <span className="badge vip">
          <Crown size={11} />
          VIP
        </span>
        <span className="store-cover-pattern" />
      </button>
      <div className="store-body">
        <button className="store-name" onClick={onClick}>
          {s.name}
          <ShieldCheck size={15} />
        </button>
        <p>{s.tag}</p>
        <div className="store-meta">
          <span>
            <Star size={12} fill="currentColor" />
            {s.rating}
          </span>
          <small>{s.type}</small>
          <button onClick={onClick} aria-label={s.name + " vitrininə keç"}>
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
function ProductDetail({
  p,
  favorite,
  isFavorite,
  addCart,
  notify,
  onStore,
  onMessage,
}: {
  p: Product;
  favorite: () => void;
  isFavorite: boolean;
  addCart: (q: number) => void;
  notify: (s: string) => void;
  onStore: () => void;
  onMessage: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(p.colors[0]);
  const [tab, setTab] = useState("description");
  const [size, setSize] = useState("40");
  return (
    <>
      <div className="product-detail">
        <div>
          <div className="detail-image">
            <img src={img(p.image)} alt={p.name} />
            <span className="image-watermark">alisveris.az</span>
            {p.vip && (
              <span className="badge vip">
                <Crown size={12} />
                VIP MƏHSUL
              </span>
            )}
          </div>
          <div className="detail-thumbs">
            <button className="active" aria-label="Əsas şəkil">
              <img src={img(p.image)} alt="Məhsulun əsas şəkli" />
            </button>
            <span>SKU: AZ-{p.id.toString().padStart(4, "0")}</span>
          </div>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.brand}</span>
          <h2>{p.name}</h2>
          <div className="rating detail-rating">
            <Star size={15} fill="currentColor" />
            <strong>{p.rating}</strong>
            <button onClick={() => setTab("reviews")}>{p.reviews} rəy</button>
            <span>·</span>
            <span className="green">
              <CheckCircle2 size={13} />
              Stokda {p.stock} ədəd
            </span>
          </div>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            {p.rental && <span>/ gün</span>}
            {p.oldPrice && <del>{money(p.oldPrice)}</del>}
            {p.oldPrice && (
              <span className="badge sale">
                −{Math.round((1 - p.price / p.oldPrice) * 100)}%
              </span>
            )}
          </div>
          <p className="detail-desc">{p.description}</p>
          <div className="option-label">
            Rəng{" "}
            <span>
              {color === p.colors[0] ? "Əsas rəng" : "Alternativ rəng"}
            </span>
          </div>
          <div className="color-options">
            {p.colors.map((c) => (
              <button
                key={c}
                style={{ background: c }}
                className={c === color ? "active" : ""}
                onClick={() => setColor(c)}
                aria-label={"Rəng " + c}
                aria-pressed={c === color}
              >
                {c === color && <Check size={14} />}
              </button>
            ))}
          </div>
          {p.category === "Geyim və moda" && (
            <>
              <div className="option-label">Ölçü</div>
              <div className="size-options">
                {["38", "39", "40", "41", "42", "43"].map((s) => (
                  <button
                    key={s}
                    className={s === size ? "active" : ""}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="detail-buy">
            <div className="quantity">
              <button
                disabled={qty <= 1}
                aria-label="Sayı azalt"
                onClick={() => setQty((n) => n - 1)}
              >
                <Minus size={15} />
              </button>
              <span>{qty}</span>
              <button
                disabled={qty >= p.stock}
                aria-label="Sayı artır"
                onClick={() => setQty((n) => n + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="btn"
              disabled={p.stock === 0}
              onClick={() => addCart(qty)}
            >
              <ShoppingBag size={18} />
              Səbətə əlavə et
            </button>
            <button
              className={
                "favorite-detail icon-btn " + (isFavorite ? "active" : "")
              }
              onClick={favorite}
              aria-label="Sevimlilərə əlavə et"
            >
              <Heart size={21} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
          <button
            className="whatsapp-btn"
            onClick={() => {
              saveState("whatsapp-interest", {
                product: p.name,
                quantity: qty,
                total: p.price * qty,
              });
              notify(
                "WhatsApp düyməsi demo üçündür. Real satıcıya mesaj göndərilmir.",
              );
            }}
          >
            <MessageCircle size={18} />
            WhatsApp ilə sifariş
            <ArrowUpRight size={17} />
          </button>
          <div className="detail-perks">
            <span>
              <Truck size={16} />
              100 ₼-dən yuxarı pulsuz çatdırılma
            </span>
            <span>
              <RotateCcw size={16} />
              14 gün ərzində geri qaytarma
            </span>
          </div>
          <div className="detail-store">
            <span className="store-logo small">{p.store.slice(0, 2)}</span>
            <div>
              <button onClick={onStore}>
                {p.store}
                <ShieldCheck size={13} />
              </button>
              <small>Təsdiqlənmiş mağaza</small>
            </div>
            <button
              className="icon-btn"
              onClick={onMessage}
              aria-label="Satıcıya mesaj göndər"
            >
              <MessageCircle size={20} />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(
                    location.origin +
                      "/?q=" +
                      encodeURIComponent(p.name) +
                      "#catalog",
                  )
                  .then(() => notify("Məhsul keçidi kopyalandı"))
                  .catch(() => notify("Keçid kopyalana bilmədi"));
              }}
              aria-label="Məhsul keçidini kopyala"
            >
              <Copy size={17} />
            </button>
          </div>
        </div>
      </div>
      <div className="detail-tabs">
        <button
          className={tab === "description" ? "active" : ""}
          onClick={() => setTab("description")}
        >
          Məhsul haqqında
        </button>
        <button
          className={tab === "specs" ? "active" : ""}
          onClick={() => setTab("specs")}
        >
          Xüsusiyyətlər
        </button>
        <button
          className={tab === "reviews" ? "active" : ""}
          onClick={() => setTab("reviews")}
        >
          Rəylər ({p.reviews})
        </button>
        <button
          className={tab === "questions" ? "active" : ""}
          onClick={() => setTab("questions")}
        >
          Sual-cavab
        </button>
      </div>
      <div className="detail-tab-content">
        {tab === "description" ? (
          <>
            <h3>Gündəlik həyat üçün düşünülmüş seçim.</h3>
            <p>{p.description}</p>
            <p className="muted">
              Məhsul məlumatları, reytinq və qiymətlər frontend dizaynı üçün
              nümunədir.
            </p>
          </>
        ) : tab === "specs" ? (
          <div className="spec-grid">
            {[
              ["Brend", p.brand],
              ["Kateqoriya", p.category],
              ["Mağaza", p.store],
              ["Vəziyyət", "Yeni"],
              ["Mövcudluq", p.stock + " ədəd"],
              ["Elan növü", p.rental ? "Günlük icarə" : "Satış"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        ) : tab === "reviews" ? (
          <>
            <div className="review-summary">
              <strong>{p.rating}</strong>
              <div>
                <span className="stars">★★★★★</span>
                <p>{p.reviews} nümunə qiymətləndirmə</p>
              </div>
            </div>
            <p>
              “Keyfiyyətli məhsuldur, çox bəyəndim. Rahat alış-veriş üçün
              təşəkkürlər!”
            </p>
            <small className="muted">Aysel M. · Nümunə rəy</small>
          </>
        ) : (
          <form
            className="question-form"
            onSubmit={(e) => {
              e.preventDefault();
              notify("Sualınız demo rejimində qeydə alındı.");
              e.currentTarget.reset();
            }}
          >
            <label>
              Satıcıya sualınız
              <textarea
                required
                placeholder="Məhsul haqqında nə bilmək istərdiniz?"
              />
            </label>
            <button className="btn">
              Sualı göndər
              <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </>
  );
}
function ProductForm({
  product,
  onSave,
}: {
  product: Product | null;
  onSave: (p: Product) => void;
}) {
  const [image, setImage] = useState(product?.image || "headphones");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  return (
    <form
      className="form-grid product-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const price = Number(f.get("price")),
          oldPrice = Number(f.get("oldPrice"));
        if (oldPrice && oldPrice <= price) {
          setError("Əvvəlki qiymət satış qiymətindən böyük olmalıdır.");
          return;
        }
        onSave({
          id: product?.id || Date.now(),
          name: String(f.get("name")),
          brand: String(f.get("brand")),
          category: String(f.get("category")),
          price,
          oldPrice: oldPrice || undefined,
          stock: Number(f.get("stock")),
          image,
          rating: product?.rating || 0,
          reviews: product?.reviews || 0,
          store: product?.store || "TechZone",
          colors: product?.colors || ["#252525"],
          description: String(f.get("description")),
          status: String(f.get("status")),
          rental: f.get("type") === "rent",
        });
      }}
    >
      <label className="span-2">
        Məhsul adı
        <input
          name="name"
          required
          defaultValue={product?.name}
          placeholder="Məsələn: Sony simsiz qulaqlıq"
          minLength={3}
        />
      </label>
      <label>
        Kateqoriya
        <select name="category" defaultValue={product?.category}>
          {categories.map((c) => (
            <option key={c.id}>{c.id}</option>
          ))}
        </select>
      </label>
      <label>
        Brend
        <input
          name="brand"
          required
          defaultValue={product?.brand}
          placeholder="Brend adı"
        />
      </label>
      <label>
        Qiymət (AZN)
        <input
          type="number"
          name="price"
          min="0.01"
          step="0.01"
          required
          defaultValue={product?.price}
        />
      </label>
      <label>
        Əvvəlki qiymət (istəyə bağlı)
        <input
          type="number"
          name="oldPrice"
          min="0"
          step="0.01"
          defaultValue={product?.oldPrice}
        />
      </label>
      <label>
        Stok sayı
        <input
          type="number"
          min="0"
          step="1"
          name="stock"
          required
          defaultValue={product?.stock ?? 1}
        />
      </label>
      <label>
        Elan növü
        <select name="type" defaultValue={product?.rental ? "rent" : "sale"}>
          <option value="sale">Satış</option>
          <option value="rent">İcarə / gün</option>
        </select>
      </label>
      <label className="span-2">
        Məhsul haqqında
        <textarea
          name="description"
          required
          defaultValue={product?.description}
          placeholder="Məhsulun xüsusiyyətləri..."
          minLength={10}
        />
      </label>
      <div className="span-2">
        <label className="upload-box">
          <ImagePlus />
          <strong>Məhsul şəkilləri əlavə edin</strong>
          <span>JPG, PNG, WEBP · maksimum 5 MB</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (
                files.some(
                  (f) =>
                    f.size > 5 * 1024 * 1024 ||
                    !["image/jpeg", "image/png", "image/webp"].includes(f.type),
                )
              ) {
                setError(
                  "Yalnız JPG, PNG, WEBP şəkilləri və maksimum 5 MB ölçü dəstəklənir.",
                );
                return;
              }
              const urls = await Promise.all(
                files.map(
                  (f) =>
                    new Promise<string>((resolve) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result));
                      r.readAsDataURL(f);
                    }),
                ),
              );
              setPhotos((a) => [...a, ...urls]);
              setError("");
            }}
          />
        </label>
        {photos.length > 0 && (
          <div className="photo-previews">
            {photos.map((src, i) => (
              <div key={i}>
                <img src={src} alt={"Yüklənmiş şəkil " + (i + 1)} />
                <button
                  type="button"
                  aria-label="Şəkli sil"
                  onClick={() => setPhotos((a) => a.filter((_, j) => i !== j))}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <small>Şəkillər demo önizləməsi üçündür.</small>
          </div>
        )}
        <label>
          Nümunə vitrin şəkli
          <select value={image} onChange={(e) => setImage(e.target.value)}>
            {[
              "headphones",
              "sneaker",
              "watch",
              "chair",
              "camera",
              "beauty",
              "speaker",
              "plant",
              "bag",
              "cup",
              "sport",
              "toy",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Status
        <select name="status" defaultValue={product?.status || "Aktiv"}>
          <option>Aktiv</option>
          <option>Qaralama</option>
          <option>Deaktiv</option>
          <option>Gözləyir</option>
        </select>
      </label>
      {error && (
        <p className="error span-2" role="alert">
          {error}
        </p>
      )}
      <div className="span-2">
        <button className="btn">
          <Check size={16} />
          Məhsulu saxla
        </button>
      </div>
    </form>
  );
}
function ImportProducts({ onImport }: { onImport: (p: Product[]) => void }) {
  const [rows, setRows] = useState<Product[]>([]);
  const [error, setError] = useState("");
  return (
    <div className="import-content">
      <p>CSV faylını seçin. İmportdan əvvəl məlumatlar yoxlanılır.</p>
      <div className="demo-notice">
        <FileText size={17} />
        Sütunlar: Ad, Qiymet, Stok, Kateqoriya
      </div>
      <label className="upload-box">
        <Upload size={27} />
        <strong>CSV faylını seçin</strong>
        <span>Maksimum 1 MB · UTF-8 formatı</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 1024 * 1024) {
              setError("Fayl 1 MB-dan kiçik olmalıdır");
              return;
            }
            const text = await f.text();
            try {
              const lines = text
                .replace(/^\uFEFF/, "")
                .trim()
                .split(/\r?\n/);
              if (lines.length < 2) throw Error("Faylda məhsul tapılmadı");
              const parsed = lines.slice(1).map((l, i) => {
                const cells =
                  l
                    .match(/("(?:[^"]|"")*"|[^,]+)(,|$)/g)
                    ?.map((s) =>
                      s
                        .replace(/,$/, "")
                        .replace(/^"|"$/g, "")
                        .replace(/""/g, '"'),
                    ) || [];
                const [name, price, stock, category] = cells;
                if (
                  !name ||
                  !Number.isFinite(Number(price)) ||
                  Number(price) <= 0 ||
                  !Number.isInteger(Number(stock)) ||
                  Number(stock) < 0 ||
                  !categories.some((c) => c.id === category)
                )
                  throw Error(
                    `${i + 2}-ci sətirdə ad, qiymət, stok və ya kateqoriya yanlışdır`,
                  );
                return {
                  id: Date.now() + i,
                  name,
                  price: Number(price),
                  stock: Number(stock),
                  category,
                  brand: "YENİ",
                  image: "headphones",
                  rating: 0,
                  reviews: 0,
                  store: "TechZone",
                  colors: ["#222"],
                  description: name,
                  status: "Qaralama",
                };
              });
              setRows(parsed);
              setError("");
            } catch (err) {
              setError((err as Error).message);
              setRows([]);
            }
          }}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <h3>{rows.length} məhsul yoxlamadan keçdi</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Məhsul</th>
                  <th>Qiymət</th>
                  <th>Stok</th>
                  <th>Kateqoriya</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{money(r.price)}</td>
                    <td>{r.stock}</td>
                    <td>{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            Məhsullar qaralama statusunda əlavə ediləcək.
          </p>
          <button className="btn" onClick={() => onImport(rows)}>
            <Check size={16} />
            İmportu təsdiqlə
          </button>
        </>
      )}
    </div>
  );
}
export default App;
