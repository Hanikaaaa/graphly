--
-- PostgreSQL database dump
--

\restrict x4yysLoJSizlweUOgwdd4CH1ICO2P2M5LCGS9fU1JpznplYQf93WUdNiohJdzBj

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: canvas_shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.canvas_shares (
    canvas_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.canvas_shares OWNER TO postgres;

--
-- Name: canvases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.canvases (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    title text DEFAULT 'Untitled Canvas'::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    access_type text DEFAULT 'private'::text NOT NULL
);


ALTER TABLE public.canvases OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: canvas_shares canvas_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canvas_shares
    ADD CONSTRAINT canvas_shares_pkey PRIMARY KEY (canvas_id, user_id);


--
-- Name: canvases canvases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canvases
    ADD CONSTRAINT canvases_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: canvas_shares canvas_shares_canvas_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canvas_shares
    ADD CONSTRAINT canvas_shares_canvas_id_fkey FOREIGN KEY (canvas_id) REFERENCES public.canvases(id) ON DELETE CASCADE;


--
-- Name: canvas_shares canvas_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canvas_shares
    ADD CONSTRAINT canvas_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: canvases canvases_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canvases
    ADD CONSTRAINT canvases_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict x4yysLoJSizlweUOgwdd4CH1ICO2P2M5LCGS9fU1JpznplYQf93WUdNiohJdzBj

