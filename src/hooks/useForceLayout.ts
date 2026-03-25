import { useMemo } from 'react';
import { type MapNode, type MapEdge } from '@/data/financialMapData';

/**
 * Simple force-directed nudge: nodes sharing more connections are pulled closer.
 * Runs a fixed number of iterations at init time (not animated).
 */
export function useForceLayout(
  initialNodes: MapNode[],
  edges: MapEdge[],
  iterations = 60,
  attractionStrength = 0.012,
  repulsionStrength = 800,
  minDist = 50
): MapNode[] {
  return useMemo(() => {
    // Build adjacency for shared-connection counting
    const adjacency = new Map<string, Set<string>>();
    edges.forEach(e => {
      if (!adjacency.has(e.from)) adjacency.set(e.from, new Set());
      if (!adjacency.has(e.to)) adjacency.set(e.to, new Set());
      adjacency.get(e.from)!.add(e.to);
      adjacency.get(e.to)!.add(e.from);
    });

    // Count shared connections between every pair
    const sharedConnections = (a: string, b: string): number => {
      const setA = adjacency.get(a);
      const setB = adjacency.get(b);
      if (!setA || !setB) return 0;
      let count = 0;
      setA.forEach(n => { if (setB.has(n)) count++; });
      // Also count direct connection
      if (setA.has(b)) count += 2;
      return count;
    };

    // Clone positions
    const pos = initialNodes.map(n => ({ x: n.x, y: n.y }));

    for (let iter = 0; iter < iterations; iter++) {
      const forces = pos.map(() => ({ fx: 0, fy: 0 }));
      const damping = 1 - iter / iterations; // cool down

      for (let i = 0; i < initialNodes.length; i++) {
        for (let j = i + 1; j < initialNodes.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Repulsion (prevent overlap)
          const repForce = repulsionStrength / (dist * dist);
          const rx = (dx / dist) * repForce;
          const ry = (dy / dist) * repForce;
          forces[i].fx -= rx;
          forces[i].fy -= ry;
          forces[j].fx += rx;
          forces[j].fy += ry;

          // Attraction based on shared connections
          const shared = sharedConnections(initialNodes[i].id, initialNodes[j].id);
          if (shared > 0) {
            const attrForce = attractionStrength * shared * dist;
            const ax = (dx / dist) * attrForce;
            const ay = (dy / dist) * attrForce;
            forces[i].fx += ax;
            forces[i].fy += ay;
            forces[j].fx -= ax;
            forces[j].fy -= ay;
          }
        }
      }

      // Apply forces with damping
      for (let i = 0; i < pos.length; i++) {
        pos[i].x += forces[i].fx * damping * 0.3;
        pos[i].y += forces[i].fy * damping * 0.3;
        // Clamp to viewBox bounds
        pos[i].x = Math.max(40, Math.min(1080, pos[i].x));
        pos[i].y = Math.max(40, Math.min(920, pos[i].y));
      }

      // Enforce minimum distance
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const min = minDist + initialNodes[i].size + initialNodes[j].size;
          if (dist < min && dist > 0) {
            const overlap = (min - dist) / 2;
            const ox = (dx / dist) * overlap;
            const oy = (dy / dist) * overlap;
            pos[i].x -= ox;
            pos[i].y -= oy;
            pos[j].x += ox;
            pos[j].y += oy;
          }
        }
      }
    }

    return initialNodes.map((n, i) => ({
      ...n,
      x: Math.round(pos[i].x),
      y: Math.round(pos[i].y),
    }));
  }, [initialNodes, edges, iterations, attractionStrength, repulsionStrength, minDist]);
}
