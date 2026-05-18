#!/usr/bin/env bun
/**
 * generate.ts
 *
 * Generates a self-contained static HTML page from a Tippy Annotator JSON export.
 *
 * Usage:
 *   bun generate.ts --json annotations.json --out index.html
 *
 * The JSON should be a single figure object or an array of figure objects
 * exported from the Tippy Annotator tool. Each figure object must have:
 *   { id, image, markers: [{ id, x_pct, y_pct, title, content, placement, color }] }
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Eta } from "eta";

const args = process.argv.slice(2);

function arg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const jsonPath = arg("--json");
const outPath = arg("--out") ?? "index.html";

if (!jsonPath) {
  console.error(
    'Usage: bun generate.ts --json <file.json> [--out index.html]'
  );
  process.exit(1);
}


type Marker = {
  id: number;
  x_pct: number;
  y_pct: number;
  title?: string;
  content?: string;
  placement?: string;
  color?: string;
};

type Figure = {
  id: string;
  image: string;
  caption?: string;
  markers: Marker[];
};

let figures: Figure[];

try {
  const raw = JSON.parse(readFileSync(resolve(jsonPath), "utf8"));
  figures = Array.isArray(raw) ? raw : [raw];
} catch (e) {
  console.error(`Failed to read/parse ${jsonPath}:`, e);
  process.exit(1);
}

// Auto-assign id if missing
figures = figures.map((fig, i) => ({
  ...fig,
  id: fig.id ?? `fig-${i + 1}`,
}));

const eta = new Eta();

const template = `
<% it.figures.forEach(function(fig) { %>
  <section id="<%= fig.id %>" class="level-2">
    <h2 class="anchored" data-anchor-id="<%= fig.id %>">
      <%= fig.caption || fig.image %>
    </h2>

    <% if (fig.naturalWidth < fig.naturalHeight) { %>

    <div class="quarto-layout-row">
      <div class="quarto-layout-cell" style="flex-basis: 50.0%;justify-content: flex-start;">
        <div class="quarto-figure quarto-figure-center">
          <div id="<%= fig.id %>" style="position:relative;display:inline-block;line-height:0;max-width:100%">
            <figure class="figure" >
              <img src="../assets/<%= fig.image %>" class="img-fluid figure-img">
              <div class="fig-markers">
                <% fig.markers.forEach(function(m) { %>
                  <div class="tippy-marker"
                       data-tippy-content="<%= m.content ? m.content : '' %>"
                       data-tippy-placement="<%= m.placement || 'top' %>"
                       style="position:absolute; left:<%= m.x_pct %>%; top:<%= m.y_pct %>%; width:24px; height:24px; transform:translate(-50%,-50%); border-radius:50%; background:<%= m.color || '#e8ff47' %>; border:2px solid #fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; font-family:monospace; color:#fff; cursor:pointer; z-index:10; box-sizing:border-box; transition:transform 0.15s"
                  ><%= m.id %></div>
                <% }) %>
            </div>
            <figcaption> <%= fig.caption || fig.image %> </figcaption>
            </figure>
          </div>
        </div>
      </div>
      <div class="quarto-layout-cell" style="flex-basis: 50.0%;justify-content: flex-start;">
        <ol type="1">
          <% fig.markers.forEach(function(m) { %>
            <li><%= m.content %></li>
          <% }) %>
        </ol>
      </div>
    </div>

    <% } else { %>
      <div class="quarto-figure quarto-figure-center">
        <div id="<%= fig.id %>" style="position:relative;display:inline-block;line-height:0;max-width:100%">
          <figure class="figure" >
            <img src="../assets/<%= fig.image %>" class="img-fluid figure-img">
            <div class="fig-markers">
              <% fig.markers.forEach(function(m) { %>
                <div class="tippy-marker"
                     data-tippy-content="<%= m.content ? m.content : '' %>"
                     data-tippy-placement="<%= m.placement || 'top' %>"
                     style="position:absolute; left:<%= m.x_pct %>%; top:<%= m.y_pct %>%; width:24px; height:24px; transform:translate(-50%,-50%); border-radius:50%; background:<%= m.color || '#e8ff47' %>; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; font-family:monospace; color:#fff; cursor:pointer; z-index:10; box-sizing:border-box; transition:transform 0.15s"
                ><%= m.id %></div>
              <% }) %>
          </div>
          <figcaption> <%= fig.caption || fig.image %> </figcaption>
          </figure>
        </div>
      </div>

      <ol type="1">
        <% fig.markers.forEach(function(m) { %>
          <li><%= m.content %></li>
        <% }) %>
      </ol>
    <% } %>

  </section>
<% }) %>

`;

const html = eta.renderString(template, {
  figures: figures,
});

writeFileSync(resolve(outPath), html, "utf8");
console.log(
  `✓ Written ${figures.length} figure${figures.length !== 1 ? "s" : ""} → ${outPath}`
);
