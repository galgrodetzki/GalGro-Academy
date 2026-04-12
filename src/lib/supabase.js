import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gajcrvxyenxjqewuvkgw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
