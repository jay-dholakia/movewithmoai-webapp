module.exports = [
"[project]/lib/supabase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-ssr] (ecmascript)");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://klvosnnkhofhqkwwehev.supabase.co") || 'https://klvosnnkhofhqkwwehev.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsdm9zbm5raG9maHFrd3dlaGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTY3MTgsImV4cCI6MjA3MjQ5MjcxOH0.C6TOPCx3sasiZj1ST3LHTnYOAnzSrcpcQSyEXfFqZlY';
// Lazy initialization to avoid SSR issues
let supabaseInstance = null;
function createSupabaseClient() {
    // Safe check for browser environment
    const isBrowser = ("TURBOPACK compile-time value", "undefined") !== 'undefined';
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: isBrowser,
            detectSessionInUrl: isBrowser,
            // Only use localStorage in browser - this check prevents SSR errors
            storage: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    });
}
// Lazy getter - only creates client when first accessed (not at module load)
function getSupabaseClient() {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient();
    }
    return supabaseInstance;
}
const supabase = (()=>{
    // Create a proxy that lazily initializes the client
    return new Proxy({}, {
        get (_target, prop) {
            const client = getSupabaseClient();
            const value = client[prop];
            // If it's a function, bind it to the client
            if (typeof value === 'function') {
                return value.bind(client);
            }
            return value;
        }
    });
})();
}),
];

//# sourceMappingURL=lib_supabase_ts_2a54012c._.js.map