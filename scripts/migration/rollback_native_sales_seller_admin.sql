-- Only after the application route has been rolled back. Keep existing Sales
-- memberships and history; this removes only the new admin write capability.
DROP FUNCTION IF EXISTS public.native_sales_admin_set_seller(uuid,uuid,uuid,boolean);
