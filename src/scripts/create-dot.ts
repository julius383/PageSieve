import { scrapeMachine } from '../scrapeMachine';
import { toDirectedGraph } from 'xstate/graph';
import * as fs from 'fs';

/**
 * Converts an XState directed graph to a Graphviz DOT format with improved styling.
 */
function directedGraphToDot(digraph: any) {
    const lines = [
        'digraph "ScrapeMachine" {',
        '  rankdir=LR;',
        '  node [fontname="Helvetica,Arial,sans-serif" fontsize=12 shape=rectangle style="rounded,filled" fillcolor="#ffffff"];',
        '  edge [fontname="Helvetica,Arial,sans-serif" fontsize=10];',
        '  splines=spline;',
        '  concentrate=true;',
        '  compound=true;',
        '  labeljust="l";',
        '  ranksep=1.0;',
        '  nodesep=0.8;',
        '  pad=0.2;',
    ];

    const processedEdges = new Set<string>();

    function simplifyEvent(event: string) {
        if (!event) return '';
        if (event.startsWith('xstate.done.actor.')) return 'done';
        if (event.startsWith('xstate.error.actor.')) return 'error';
        if (event.startsWith('xstate.after.')) {
            const match = event.match(/xstate\.after\.([^.]+)/);
            return match ? `after(${match[1]})` : 'after';
        }
        if (event.startsWith('xstate.init')) return 'init';
        return event;
    }

    function getGuardLabel(guard: any) {
        if (!guard) return null;
        if (typeof guard === 'string') return guard;
        if (typeof guard === 'object') {
            if (guard.type && guard.type !== 'xstate.guard' && guard.type !== 'guard') {
                return guard.type;
            }
            // Check for names in various places XState might put them
            const name = guard.name || guard.predicate?.name;
            if (name && name !== 'guard') return name;
        }
        return 'cond';
    }

    function getInitialKey(stateNode: any) {
        const initial = stateNode.initial;
        if (!initial) return null;
        if (typeof initial === 'string') return initial;
        if (initial.target && initial.target.length > 0) return initial.target[0].key;
        return null;
    }

    function processNode(node: any, indent = '  ') {
        const id = node.id;
        const stateNode = node.stateNode;
        const key = stateNode.key;
        const isFinal = stateNode.type === 'final';
        const isParallel = stateNode.type === 'parallel';

        // Use a safe ID for clusters
        const clusterId = id.replace(/\./g, '_');

        if (node.children && node.children.length > 0) {
            lines.push(`${indent}subgraph "cluster_${clusterId}" {`);
            lines.push(`${indent}  label="${key}${isParallel ? ' (parallel)' : ''}";`);
            lines.push(`${indent}  style="rounded,filled,dashed";`);
            lines.push(`${indent}  fillcolor="#f8f9fa";`);
            lines.push(`${indent}  fontname="Helvetica-Bold,Arial-Bold,sans-serif";`);

            // Initial state indicator
            const initialKey = getInitialKey(stateNode);
            if (initialKey && !isParallel) {
                const initialNode = node.children.find((c: any) => c.stateNode.key === initialKey);
                if (initialNode) {
                    const startNodeId = `start_${clusterId}`;
                    lines.push(`${indent}  "${startNodeId}" [shape=circle label="" width=0.1 height=0.1 fillcolor=black];`);
                    lines.push(`${indent}  "${startNodeId}" -> "${initialNode.id}" [weight=2];`);
                }
            }

            for (const child of node.children) {
                processNode(child, indent + '  ');
            }
            lines.push(`${indent}}`);
        } else {
            const shape = isFinal ? 'doublecircle' : 'rectangle';
            const fill = isFinal ? '#e9ecef' : '#ffffff';
            lines.push(`${indent}"${id}" [label="${key}" shape="${shape}" fillcolor="${fill}"];`);
        }

        // Process edges (transitions)
        const edges = [...node.edges];

        // Explicitly handle 'always' (eventless) transitions if they might be missing
        if (stateNode.always) {
            for (const t of stateNode.always) {
                const target = t.target?.[0]?.id;
                if (target) {
                    const guard = getGuardLabel(t.guard);
                    const edgeKey = `${id}->${target}::${guard}`;
                    if (!processedEdges.has(edgeKey)) {
                        let label = guard ? `[${guard}]` : "";
                        lines.push(`  "${id}" -> "${target}" [label="${label}" style=dashed];`);
                        processedEdges.add(edgeKey);
                    }
                }
            }
        }

        for (const edge of edges) {
            const sourceId = edge.source.id;
            const targetId = edge.target.id;
            const eventType = edge.transition.eventType;
            const event = simplifyEvent(eventType);
            const guard = getGuardLabel(edge.transition.guard);

            // Unique key for deduplication
            const edgeKey = `${sourceId}->${targetId}:${event}:${guard}`;
            if (processedEdges.has(edgeKey)) continue;
            processedEdges.add(edgeKey);

            let label = event;
            if (guard) {
                label = label ? `${label} [${guard}]` : `[${guard}]`;
            }

            const attrs = [`label="${label || ''}"`];

            // Visual cues for different types of transitions
            if (event === 'error') {
                attrs.push('color="#dc3545"', 'fontcolor="#dc3545"');
            } else if (event === 'done') {
                attrs.push('color="#28a745"', 'fontcolor="#28a745"');
            }

            if (!event && guard) {
                attrs.push('style=dashed'); // Eventless transitions
            }

            if (event === 'STOP') {
                attrs.push('color="#6c757d"', 'fontcolor="#6c757d"', 'style=dotted');
            }

            lines.push(`  "${sourceId}" -> "${targetId}" [${attrs.join(' ')}];`);
        }
    }

    processNode(digraph);
    lines.push('}');
    return lines.join('\n');
}

console.log('Generating machine diagrams...');
try {
    const digraph = toDirectedGraph(scrapeMachine);
   const dot = directedGraphToDot(digraph);
    fs.writeFileSync('machine.dot', dot);
    console.log('Successfully saved machine.dot');
} catch (e) {
    console.error('Failed to generate machine.dot:', e);
}
