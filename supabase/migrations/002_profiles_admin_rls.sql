-- Permette ai master di gestire tutti i profili dall'app (schermata Admin)

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_master());

CREATE POLICY "profiles_insert_master"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_update_master"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_delete_master"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_master());
