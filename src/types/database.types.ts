export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "recibido"
  | "en_preparacion"
  | "listo_entrega"
  | "entregado"
  | "cancelado";

export type UserRole = "cliente" | "vendedor" | "empleado" | "dueno" | "administrador";

export interface Database {
  nexia_tienda: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          sku: string;
          slug: string | null;
          name: string;
          description: string | null;
          benefits_description: string | null;
          price: number;
          image_url: string | null;
          search_tags: string[];
          category: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sku: string;
          slug?: string | null;
          name: string;
          description?: string | null;
          benefits_description?: string | null;
          price: number;
          image_url?: string | null;
          search_tags?: string[];
          category?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sku?: string;
          slug?: string | null;
          name?: string;
          description?: string | null;
          benefits_description?: string | null;
          price?: number;
          image_url?: string | null;
          search_tags?: string[];
          category?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          tenant_id: string;
          stock: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          tenant_id: string;
          stock?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: {
          stock?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          status: OrderStatus;
          total: number;
          customer_name: string | null;
          notes: string | null;
          stripe_payment_intent_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          status?: OrderStatus;
          total: number;
          customer_name?: string | null;
          notes?: string | null;
          stripe_payment_intent_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: OrderStatus;
          total?: number;
          customer_name?: string | null;
          notes?: string | null;
          stripe_payment_intent_id?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
        };
      };
      invitations: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: string;
          invited_by: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          role: string;
          invited_by?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
      };
      removal_requests: {
        Row: {
          id: string;
          tenant_id: string;
          requested_by: string;
          invitation_id: string | null;
          target_email: string;
          reason: string | null;
          status: string;
          processed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          requested_by: string;
          invitation_id?: string | null;
          target_email: string;
          reason?: string | null;
          status?: string;
          processed_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          processed_by?: string | null;
        };
      };
      user_tenants: {
        Row: {
          user_id: string;
          tenant_id: string;
          role: UserRole;
        };
        Insert: {
          user_id: string;
          tenant_id: string;
          role?: UserRole;
        };
        Update: {
          role?: UserRole;
        };
      };
      sale_sessions: {
        Row: {
          id: string;
          tenant_id: string;
          vendedor_id: string | null;
          customer_name: string | null;
          total: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          vendedor_id?: string | null;
          customer_name?: string | null;
          total: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          customer_name?: string | null;
          total?: number;
          notes?: string | null;
        };
      };
      sale_session_items: {
        Row: {
          id: string;
          session_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
        };
      };
    };
    Views: {
      v_sales_by_hour: {
        Row: {
          tenant_id: string;
          hour: number;
          order_count: number;
          revenue: number;
        };
      };
      v_top_products: {
        Row: {
          tenant_id: string;
          product_id: string;
          name: string;
          sku: string;
          price: number;
          image_url: string | null;
          category: string | null;
          units_sold: number;
          revenue: number;
        };
      };
      v_inventory_suggestions: {
        Row: {
          tenant_id: string;
          product_id: string;
          name: string;
          category: string | null;
          image_url: string | null;
          stock: number;
          low_stock_threshold: number;
          units_sold: number;
          sugerencia: "SIN_STOCK" | "REABASTECER" | "BAJO" | "OK";
        };
      };
      v_sales_summary: {
        Row: {
          tenant_id: string;
          total_orders: number;
          delivered_orders: number;
          cancelled_orders: number;
          total_revenue: number;
          revenue_today: number;
          revenue_this_month: number;
        };
      };
    };
  };
}
