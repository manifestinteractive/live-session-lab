"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, Info, LockKeyhole, LogOut, MicOff, ShieldCheck, Users, VideoOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

function PageFrame({ children, room = false }: { children: React.ReactNode; room?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
          <Link href="/" aria-label="Live Session Lab home" className="flex min-h-11 items-center gap-3 rounded-lg font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FlaskConical className="size-5" aria-hidden="true" /></span>
            Live Session Lab
          </Link>
          <nav aria-label="Main" className="flex gap-2 text-sm">
            <Link href="/" aria-current={!room ? "page" : undefined} className="nav-link">Setup</Link>
            <Link href="/room" aria-current={room ? "page" : undefined} className="nav-link">Room preview</Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 outline-none sm:px-8 sm:py-12">{children}</main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-sm text-muted-foreground sm:px-8">
        <p>An independent experiment in browser video.</p>
        <p className="flex items-center gap-2"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />For test conversations only.</p>
      </footer>
    </div>
  );
}

function DisconnectedNotice() {
  return (
    <Alert role="note" className="border-primary/20 bg-accent px-4 py-3">
      <Info aria-hidden="true" />
      <AlertTitle>Disconnected demonstration</AlertTitle>
      <AlertDescription>No call is active. This preview does not access your camera or microphone.</AlertDescription>
    </Alert>
  );
}

function MediaPlaceholder({ remote = false }: { remote?: boolean }) {
  return (
    <section aria-label={remote ? "Remote participant placeholder" : "Local camera placeholder"} className="media-stage relative flex min-h-72 flex-col overflow-hidden rounded-2xl border p-4 sm:min-h-96 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-stage-muted" />{remote ? "Second participant" : "Your preview"}</span>
        <Badge variant="outline" className="border-stage-muted/30 text-stage-muted">Disconnected</Badge>
      </div>
      <Empty className="px-2 py-10">
        <EmptyHeader>
          <EmptyMedia className="mb-4 rounded-full border border-stage-muted/20 bg-stage-muted/10 p-6">
            {remote ? <Users className="size-8 text-stage-muted" aria-hidden="true" /> : <VideoOff className="size-8 text-stage-muted" aria-hidden="true" />}
          </EmptyMedia>
          <EmptyTitle className="text-lg">{remote ? "A space for someone else" : "Your camera is off"}</EmptyTitle>
          <EmptyDescription className="max-w-64">{remote ? "No participant is connected. This is a room layout preview." : "Nothing is being captured or shared in this demonstration."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <p className="flex items-center gap-2 text-xs text-stage-muted"><MicOff className="size-3.5" aria-hidden="true" />{remote ? "No remote media" : "Microphone is off"}</p>
    </section>
  );
}

function MediaControls() {
  return (
    <div role="group" aria-label="Media controls, unavailable in this demonstration" className="flex flex-wrap justify-center gap-3">
      <Button variant="outline" disabled className="min-h-11"><MicOff data-icon="inline-start" aria-hidden="true" />Microphone off</Button>
      <Button variant="outline" disabled className="min-h-11"><VideoOff data-icon="inline-start" aria-hidden="true" />Camera off</Button>
    </div>
  );
}

function PreJoin() {
  return (
    <Card className="h-fit [--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle><h2 className="text-xl">Before you join</h2></CardTitle>
        <CardDescription>Explore the setup. Calls will require a private invitation.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="display-name">Temporary display name</FieldLabel>
            <Input id="display-name" placeholder="Choose a test name" autoComplete="off" maxLength={40} aria-describedby="name-help" className="min-h-11 md:text-base" />
            <FieldDescription id="name-help">Use a made-up name. This field is not submitted or saved.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="camera">Camera</FieldLabel>
            <NativeSelect id="camera" disabled aria-describedby="device-help" className="w-full [&_select]:min-h-11"><NativeSelectOption>Unavailable in this preview</NativeSelectOption></NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="microphone">Microphone</FieldLabel>
            <NativeSelect id="microphone" disabled aria-describedby="device-help" className="w-full [&_select]:min-h-11"><NativeSelectOption>Unavailable in this preview</NativeSelectOption></NativeSelect>
            <FieldDescription id="device-help">Device selection will be available when calls are implemented.</FieldDescription>
          </Field>
          <div className="space-y-3">
            <Button disabled className="min-h-11 w-full" aria-describedby="join-help"><LockKeyhole data-icon="inline-start" aria-hidden="true" />Join session</Button>
            <p id="join-help" className="text-center text-sm text-muted-foreground">Joining is unavailable in this demonstration.</p>
          </div>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/room" className={cn(buttonVariants({ variant: "ghost" }), "min-h-11 whitespace-normal text-center")}>Explore room preview<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
      </CardFooter>
    </Card>
  );
}

export function Introduction() {
  return (
    <PageFrame>
      <div className="max-w-2xl space-y-4">
        <Badge variant="secondary" className="h-auto px-3 py-1">Interface preview</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">A little closer.<br /><span className="text-muted-foreground">Right in your browser.</span></h1>
        <p className="max-w-xl text-base/relaxed text-muted-foreground">A small experiment in face-to-face conversation. The planned experience connects two people through a private invitation.</p>
      </div>
      <DisconnectedNotice />
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <MediaPlaceholder />
          <MediaControls />
          <div className="flex items-start gap-3 px-1 pt-2 text-sm/relaxed text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>No recording or transcription. Use test conversations only, and keep personal or sensitive information out of the demo.</p>
          </div>
        </div>
        <PreJoin />
      </div>
    </PageFrame>
  );
}

export function RoomPreview() {
  return (
    <PageFrame room>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Badge variant="secondary" className="h-auto px-3 py-1">Interface preview</Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Room preview</h1>
          <p className="text-muted-foreground">A place for two. No one is connected.</p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}><LogOut data-icon="inline-start" aria-hidden="true" />Exit preview</Link>
      </div>
      <DisconnectedNotice />
      <div className="grid gap-4 md:grid-cols-2"><MediaPlaceholder /><MediaPlaceholder remote /></div>
      <div className="space-y-3"><MediaControls /><p className="text-center text-sm text-muted-foreground">Media controls are unavailable in this demonstration.</p></div>
      <details className="rounded-xl border bg-card px-4 text-sm">
        <summary className="min-h-11 cursor-pointer content-center py-3 font-medium">Connection details</summary>
        <dl className="grid gap-3 border-t py-4 sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Connection</dt><dd className="mt-1 font-medium">Disconnected demonstration</dd></div>
          <div><dt className="text-muted-foreground">Connected participants</dt><dd className="mt-1 font-medium">0</dd></div>
          <div><dt className="text-muted-foreground">Media tracks</dt><dd className="mt-1 font-medium">None</dd></div>
          <div><dt className="text-muted-foreground">Connection quality</dt><dd className="mt-1 font-medium">Unavailable, no SDK connection</dd></div>
        </dl>
      </details>
    </PageFrame>
  );
}
