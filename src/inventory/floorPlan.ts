import { DatabaseService } from '../db/index.js';
import { can, AuthActor } from '../auth/policy.js';

export interface FloorPlanGeometry {
  version: number;
  unit: string;
  bounds: [number, number, number, number];
  elements: Array<{
    t: 'wall' | 'door' | 'window' | 'corridor' | 'room' | 'seat' | 'fixture';
    id?: string;
    label?: string;
    pts?: number[][];
    poly?: number[][];
    at?: number[];
    pos?: number[];
    size?: number[];
    rot?: number;
    w?: number;
    swing?: string;
    kind?: string;
    meta?: Record<string, any>;
  }>;
}

export class FloorPlanService {
  constructor(private db: DatabaseService) {}

  validateGeometry(geometry: FloorPlanGeometry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!geometry.bounds || geometry.bounds.length !== 4) {
      errors.push('Geometry must specify [minX, minY, maxX, maxY] bounds');
    }

    if (!Array.isArray(geometry.elements)) {
      errors.push('Elements must be an array');
      return { valid: false, errors };
    }

    const roomIds = new Set<string>();
    const seatIds = new Set<string>();

    for (const el of geometry.elements) {
      if (el.t === 'room') {
        if (!el.id) {
          errors.push('Room elements must have an id');
        } else if (roomIds.has(el.id)) {
          errors.push(`Duplicate room id: ${el.id}`);
        } else {
          roomIds.add(el.id);
        }
      } else if (el.t === 'seat') {
        if (!el.id) {
          errors.push('Seat elements must have an id');
        } else if (seatIds.has(el.id)) {
          errors.push(`Duplicate seat id: ${el.id}`);
        } else {
          seatIds.add(el.id);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async saveDraft(
    floorId: string,
    geometry: FloorPlanGeometry,
    actor: AuthActor
  ): Promise<{ mapId: string; version: number }> {
    if (!can(actor, 'floor_plan.edit')) {
      throw new Error('FORBIDDEN: Insufficient permissions to edit floor plan');
    }

    const val = this.validateGeometry(geometry);
    if (!val.valid) {
      throw new Error(`VALIDATION_ERROR: ${val.errors.join(', ')}`);
    }

    // Get current version
    const res = await this.db.query(
      `SELECT version FROM floor_maps WHERE floor_id = $1 ORDER BY version DESC LIMIT 1`,
      [floorId]
    );

    const nextVer = res.rows.length > 0 ? res.rows[0].version + 1 : 1;
    const mapId = `map_${floorId}_v${nextVer}`;

    await this.db.query(
      `INSERT INTO floor_maps (id, floor_id, version, status, geometry_json, created_by)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [mapId, floorId, nextVer, JSON.stringify(geometry), actor.id]
    );

    return { mapId, version: nextVer };
  }

  async publishMap(
    floorId: string,
    version: number,
    actor: AuthActor
  ): Promise<void> {
    if (!can(actor, 'floor_plan.publish')) {
      throw new Error('FORBIDDEN: Insufficient permissions to publish floor plan');
    }

    await this.db.transaction(async (client) => {
      // Archive current published maps for this floor
      await client.query(
        `UPDATE floor_maps SET status = 'ARCHIVED' WHERE floor_id = $1 AND status = 'PUBLISHED'`,
        [floorId]
      );

      // Set target version as PUBLISHED
      const updateRes = await client.query(
        `UPDATE floor_maps SET status = 'PUBLISHED' WHERE floor_id = $1 AND version = $2`,
        [floorId, version]
      );

      if (updateRes.rowCount === 0) {
        throw new Error('NOT_FOUND: Target map version does not exist');
      }
    });
  }

  async getPublishedMap(floorId: string): Promise<FloorPlanGeometry | null> {
    const res = await this.db.query(
      `SELECT geometry_json FROM floor_maps WHERE floor_id = $1 AND status = 'PUBLISHED' ORDER BY version DESC LIMIT 1`,
      [floorId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return JSON.parse(res.rows[0].geometry_json);
  }

  /**
   * Generates sanitized student-viewable SVG from structured geometry
   */
  renderFloorSvg(geometry: FloorPlanGeometry, seatStatusMap: Record<string, string> = {}): string {
    const [minX, minY, maxX, maxY] = geometry.bounds;
    const width = maxX - minX;
    const height = maxY - minY;

    let svg = `<svg viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="dormex-floor-map">\n`;
    svg += `  <style>
      .wall { stroke: #1e293b; stroke-width: 8; stroke-linecap: round; }
      .corridor { fill: #f8fafc; stroke: #e2e8f0; }
      .room { fill: #ffffff; stroke: #0f172a; stroke-width: 2; rx: 4; }
      .seat { cursor: pointer; transition: all 0.2s; rx: 4; }
      .seat-free { fill: #10b981; stroke: #059669; }
      .seat-taken { fill: #94a3b8; stroke: #64748b; cursor: not-allowed; }
      .seat-blocked { fill: #f43f5e; stroke: #e11d48; }
      .seat-mine { fill: #3b82f6; stroke: #1d4ed8; }
      .label { font-family: sans-serif; font-size: 14px; fill: #0f172a; text-anchor: middle; }
    </style>\n`;

    for (const el of geometry.elements) {
      if (el.t === 'wall' && el.pts) {
        const [[x1, y1], [x2, y2]] = el.pts;
        svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wall" />\n`;
      } else if (el.t === 'corridor' && el.pts) {
        const pts = el.pts.map(([x, y]) => `${x},${y}`).join(' ');
        svg += `  <polygon points="${pts}" class="corridor" />\n`;
      } else if (el.t === 'room' && el.poly) {
        const pts = el.poly.map(([x, y]) => `${x},${y}`).join(' ');
        svg += `  <polygon points="${pts}" class="room" id="${el.id}" />\n`;
        if (el.label && el.poly[0]) {
          svg += `  <text x="${el.poly[0][0] + 30}" y="${el.poly[0][1] + 30}" class="label font-bold">${el.label}</text>\n`;
        }
      } else if (el.t === 'seat' && el.pos && el.size) {
        const [x, y] = el.pos;
        const [w, h] = el.size;
        const status = seatStatusMap[el.id || ''] || 'free';
        svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" class="seat seat-${status}" id="${el.id}" data-seat="${el.id}" />\n`;
        if (el.label) {
          svg += `  <text x="${x + w / 2}" y="${y + h / 2 + 5}" class="label">${el.label}</text>\n`;
        }
      }
    }

    svg += '</svg>';
    return svg;
  }
}
