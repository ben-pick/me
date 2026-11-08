---
slug: running-code-nobody-has-read
title: Running code nobody has read
date: 2026-11-03
summary: Seventeen hours from first prompt to a merged system that runs applications written by a model.
project: redacted
diagram: architecture
---

Seventeen hours after my first prompt to a coding agent, the first full version of [REDACTED] merged. A model writes an application with a front end, a back end and a database, and [REDACTED] runs it. Agents also wrote nearly all of the platform underneath, so models are on both sides of the sandbox.

Nobody reads a generated application before it runs, and a model that is right 99% of the time is still wrong for someone every day. So [REDACTED] treats generated code as code from a stranger and designs from the worst case. Each application gets its own V8 isolate on Cloudflare's Dynamic Workers and its own SQLite database. Network access starts off, permissions get granted one at a time, and the code never receives a raw secret. Browser code runs on a separate origin, away from the session cookies of the app where accounts live. The target worst case is an application that breaks itself.

Bad output also has to be cheap to undo. An application's bundle is immutable and its content hash is its version id. Publishing moves a pointer, and rolling back moves it to an earlier hash.

The model gets the same least privilege as its code. My first chat agent tried to rebuild the application while asking a question, then explained its own file structure to me. It now reads a summary of the application and has one tool, which triggers a build. No tool call means no build.

Then there is the question of where the work lives. A turn started as a stream over one HTTP response, so refreshing the page killed code generation midway. A database could record the result, but a running turn needs an owner that outlives any connection. Each application now has one Durable Object that runs one turn at a time and replays the stream to whoever reconnects.

The agents building all this needed containment as well. They broke my written rules without mentioning it, including one rule that pointed at a document that didn't exist. My check suite once reported 44 of 44 tasks passing, all replayed from cache, while a clean clone failed. Rules I care about are now failing checks, and the main branch runs uncached.

Two tests cover most of this, and you can run them on anything you've built with AI. Ask what happens when the code is wrong. Then close the tab at the worst possible moment and see what survives.
