
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MenuItem, Order, OrderStatus, UserRole, CartItem, LatLng, PaymentMethod, Driver, PixConfig, Review, SystemNotification } from '../types';
import { INITIAL_MENU } from '../constants';
import { saveMenuToDB, getMenuFromDB } from '../utils/db';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  menu: MenuItem[];
  setMenu: (menu: MenuItem[]) => void;
  isLoadingMenu: boolean;
  addMenuItem: (item: MenuItem) => void;
  removeMenuItem: (id: string) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  toggleCart: () => void;
  orders: Order[];
  placeOrder: (customerName: string, address: string, addressNumber: string, cep: string, referencePoint: string, paymentMethod: PaymentMethod, changeFor?: string) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  assignDriver: (orderId: string, driverId: string) => void;
  updateMenuItem: (updatedItem: MenuItem) => void;
  isAdminLoggedIn: boolean;
  loginAdmin: (password: string) => boolean;
  changeAdminPassword: (newPassword: string) => void;
  resetAdminPassword: (recoveryKey: string) => boolean;
  logoutAdmin: () => void;
  driverLocation: LatLng;
  updateDriverLocation: (loc: LatLng) => void;
  pixConfig: PixConfig;
  setPixConfig: (config: PixConfig) => void;
  drivers: Driver[];
  addDriver: (name: string, phone: string, password?: string, customId?: string) => void;
  removeDriver: (id: string) => void;
  reviews: Review[];
  addReview: (review: Review) => void;
  lastNotification: SystemNotification | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Restaurante (Centro fictício)
const INITIAL_DRIVER_LOCATION = { lat: -23.5505, lng: -46.6333 };

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  
  // Initialize Menu with default constant, but data will be loaded asynchronously
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true); 
  const [isMenuLoaded, setIsMenuLoaded] = useState(false);

  // Notifications State
  const [lastNotification, setLastNotification] = useState<SystemNotification | null>(null);

  const sendNotification = (targetRole: UserRole, message: string) => {
    setLastNotification({
      id: Math.random().toString(36),
      message,
      targetRole,
      timestamp: Date.now()
    });
  };

  // Load Menu Async from IndexedDB
  useEffect(() => {
    const initMenu = async () => {
      setIsLoadingMenu(true);
      try {
        const dbMenu = await getMenuFromDB();
        
        // Use DB data if it is a valid array (even if empty, meaning user deleted all items)
        if (Array.isArray(dbMenu)) {
          setMenu(dbMenu);
        } else {
          // If DB is null (first run ever), save INITIAL_MENU to DB so we have a persistent start
          console.log("Initializing DB with default menu");
          await saveMenuToDB(INITIAL_MENU);
          setMenu(INITIAL_MENU);
        }
      } catch (err) {
        console.error("Initialization error - defaulting to constant", err);
      } finally {
        setIsMenuLoaded(true);
        setIsLoadingMenu(false);
      }
    };
    initMenu();
  }, []);

  // Save Menu to IndexedDB whenever it changes
  useEffect(() => {
    if (isMenuLoaded) {
       saveMenuToDB(menu).catch(e => console.error("Failed to save menu to DB", e));
    }
  }, [menu, isMenuLoaded]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Reviews State
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem('entrega_local_reviews');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addReview = (review: Review) => {
    const updatedReviews = [review, ...reviews];
    setReviews(updatedReviews);
    try {
      localStorage.setItem('entrega_local_reviews', JSON.stringify(updatedReviews));
    } catch (e) { console.error("Failed to save reviews", e); }
  };

  // Settings: Pix
  const [pixConfig, setPixConfigState] = useState<PixConfig>(() => {
    try {
      const saved = localStorage.getItem('entrega_local_pix_config');
      return saved ? JSON.parse(saved) : { key: '000.000.000-00', bankName: 'Banco Exemplo', holderName: 'Sua Empresa Ltda' };
    } catch {
       return { key: '000.000.000-00', bankName: 'Banco Exemplo', holderName: 'Sua Empresa Ltda' };
    }
  });

  const setPixConfig = (config: PixConfig) => {
    setPixConfigState(config);
    try {
      localStorage.setItem('entrega_local_pix_config', JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save pix config", e);
    }
  };

  // Drivers
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const saved = localStorage.getItem('entrega_local_drivers');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((d: any) => ({ ...d, password: d.password || '1234' }));
      }
      return [
        { id: '101', name: 'João Motoboy', phone: '11999999999', active: true, password: '123' },
        { id: '102', name: 'Maria Entregas', phone: '11888888888', active: true, password: '123' }
      ];
    } catch {
       return [];
    }
  });

  const addDriver = (name: string, phone: string, password?: string, customId?: string) => {
    const id = customId && customId.trim() !== '' 
      ? customId.trim() 
      : Math.floor(1000 + Math.random() * 9000).toString();

    if (drivers.some(d => d.id === id)) {
      alert("Erro: Já existe um entregador com este ID.");
      return;
    }

    const newDriver: Driver = { 
      id, 
      name, 
      phone, 
      active: true,
      password: password || '1234' 
    };
    const updated = [...drivers, newDriver];
    setDrivers(updated);
    try {
      localStorage.setItem('entrega_local_drivers', JSON.stringify(updated));
    } catch (e) { console.error("Failed to save drivers", e); }
  };

  const removeDriver = (id: string) => {
    const updated = drivers.filter(d => d.id !== id);
    setDrivers(updated);
    try {
      localStorage.setItem('entrega_local_drivers', JSON.stringify(updated));
    } catch (e) { console.error("Failed to save drivers", e); }
  };
  
  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('entrega_local_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) }));
      } catch (e) {
        console.error("Failed to load orders", e);
        return [];
      }
    }
    return [];
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPasswordState] = useState(() => {
    return localStorage.getItem('entrega_local_admin_pass') || '1234';
  });

  const [driverLocation, setDriverLocation] = useState<LatLng>(INITIAL_DRIVER_LOCATION);

  // Persist orders
  useEffect(() => {
    try {
      localStorage.setItem('entrega_local_orders', JSON.stringify(orders));
    } catch (e) {
      console.error("LocalStorage Limit Exceeded or Error Saving Orders", e);
    }
  }, [orders]);

  // Sync Tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'entrega_local_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const formatted = parsed.map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) }));
          setOrders(formatted);
        } catch (err) {
          console.error("Sync error", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const toggleCart = () => setIsCartOpen(prev => !prev);

  const placeOrder = (customerName: string, address: string, addressNumber: string, cep: string, referencePoint: string, paymentMethod: PaymentMethod, changeFor?: string) => {
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      status: OrderStatus.PENDING,
      customerName,
      address,
      addressNumber,
      cep,
      referencePoint,
      paymentMethod,
      changeFor,
      createdAt: new Date()
    };
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    
    try {
      localStorage.setItem('entrega_local_orders', JSON.stringify(updatedOrders));
    } catch (e) { console.error("Order Save Failed", e); }
    
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const oldStatus = orders[orderIndex].status;
    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = { ...updatedOrders[orderIndex], status };
    
    setOrders(updatedOrders);

    // Notify Admin Logic
    // If status changed to DELIVERING (Driver Accepted) OR DELIVERED (Driver Finished)
    if (oldStatus !== status) {
      const order = updatedOrders[orderIndex];
      const driver = drivers.find(d => d.id === order.driverId);
      const driverName = driver ? driver.name : 'Entregador';

      if (status === OrderStatus.DELIVERING) {
        sendNotification(UserRole.ADMIN, `🏍️ ${driverName} saiu para entrega do pedido #${order.id}`);
      } else if (status === OrderStatus.DELIVERED) {
        sendNotification(UserRole.ADMIN, `✅ Entrega do ${driverName} foi realizada! (Pedido #${order.id})`);
      }
    }
  };

  const assignDriver = (orderId: string, driverId: string) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, driverId, status: o.status === OrderStatus.PENDING ? OrderStatus.PREPARING : o.status } : o);
    setOrders(updatedOrders);
    
    // Notify Driver
    const order = orders.find(o => o.id === orderId);
    const orderNum = order ? order.id : '';
    sendNotification(UserRole.DRIVER, `📦 Pedido #${orderNum} pronto para entrega!`);
  };

  const updateMenuItem = (updatedItem: MenuItem) => {
    setMenu(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const addMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
  }

  const removeMenuItem = (id: string) => {
    // Explicit filtering ensuring type compatibility
    setMenu(prev => {
        const filtered = prev.filter(item => String(item.id) !== String(id));
        return filtered;
    });
  }

  const loginAdmin = (password: string) => {
    if (password === adminPassword) {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const changeAdminPassword = (newPassword: string) => {
    setAdminPasswordState(newPassword);
    localStorage.setItem('entrega_local_admin_pass', newPassword);
  };

  const resetAdminPassword = (recoveryKey: string) => {
    if (recoveryKey === 'master' || recoveryKey === 'admin123') {
      const defaultPass = '1234';
      setAdminPasswordState(defaultPass);
      localStorage.setItem('entrega_local_admin_pass', defaultPass);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setRole(UserRole.CUSTOMER);
  };

  const updateDriverLocation = (loc: LatLng) => {
    setDriverLocation(loc);
  };

  return (
    <AppContext.Provider value={{
      role, setRole,
      menu, setMenu, addMenuItem, removeMenuItem, isLoadingMenu,
      cart, addToCart, removeFromCart, clearCart, isCartOpen, toggleCart,
      orders, placeOrder, updateOrderStatus, assignDriver,
      updateMenuItem,
      isAdminLoggedIn, loginAdmin, changeAdminPassword, resetAdminPassword, logoutAdmin,
      driverLocation, updateDriverLocation,
      pixConfig, setPixConfig,
      drivers, addDriver, removeDriver,
      reviews, addReview,
      lastNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
