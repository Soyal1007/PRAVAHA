// Security Manager for PRAVAHA Mesh Network Integrity & Trusted Node Validation

import { MeshMessage, MeshNode, MeshNodeStatus } from './meshTypes';

export class SecurityManager {
  private networkSecret: string = 'PRAVAHA_MESH_SECURE_PSK_2026';
  private trustedNodes: Map<string, MeshNodeStatus> = new Map();

  constructor() {
    // Seed trusted nodes
    this.trustedNodes.set('PRV-NODE-A8F31', 'TRUSTED');
    this.trustedNodes.set('PRV-NODE-B82A', 'TRUSTED');
    this.trustedNodes.set('PRV-NODE-C17F', 'TRUSTED');
    this.trustedNodes.set('PRV-NODE-GATEWAY-01', 'TRUSTED');
  }

  getNodeStatus(nodeId: string): MeshNodeStatus {
    return this.trustedNodes.get(nodeId) || 'PROVISIONED'; // Default provisioned for demo
  }

  setNodeStatus(nodeId: string, status: MeshNodeStatus): void {
    this.trustedNodes.set(nodeId, status);
  }

  /**
   * Generates a digital integrity signature for a mesh message.
   */
  generateSignature(messageId: string, originNodeId: string, payload: any): string {
    const raw = `${messageId}:${originNodeId}:${JSON.stringify(payload)}:${this.networkSecret}`;
    // Simple fast hashing simulation
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `SIG-PRV-${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  /**
   * Verifies message integrity & origin signature.
   */
  verifyMessage(message: MeshMessage): { isValid: boolean; reason?: string } {
    const nodeStatus = this.getNodeStatus(message.originNodeId);
    if (nodeStatus === 'BLOCKED') {
      return { isValid: false, reason: `Node ${message.originNodeId} is BLOCKED from mesh network.` };
    }

    if (nodeStatus === 'UNTRUSTED') {
      return { isValid: false, reason: `Node ${message.originNodeId} is UNTRUSTED. Requires manual verification.` };
    }

    if (message.signature) {
      const expectedSig = this.generateSignature(message.messageId, message.originNodeId, message.payload);
      if (message.signature !== expectedSig) {
        return { isValid: false, reason: `Invalid cryptographic signature for message ${message.messageId}.` };
      }
    }

    return { isValid: true };
  }

  provisionNode(node: MeshNode): MeshNode {
    const status = this.getNodeStatus(node.nodeId);
    return {
      ...node,
      status,
    };
  }
}
