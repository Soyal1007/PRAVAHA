// Transport Manager Interface & Driver for BLE / Web Bluetooth / WebRTC / Mesh Transport Abstraction

import { MeshMessage, MeshNode } from './meshTypes';
import { meshEventBus } from './MeshEventBus';
import { RealWebBluetoothDriver } from './RealWebBluetoothDriver';
import { realWebRTCChannelDriver, RealWebRTCChannelDriver } from './RealWebRTCChannelDriver';

export interface TransportDriver {
  name: string;
  isAvailable: () => Promise<boolean>;
  discoverPeers: () => Promise<MeshNode[]>;
  startAdvertising: (localNode: MeshNode) => Promise<boolean>;
  stopAdvertising: () => Promise<void>;
  connect: (targetNodeId: string) => Promise<boolean>;
  disconnect: (targetNodeId: string) => Promise<void>;
  sendMessage: (targetNodeId: string, message: MeshMessage) => Promise<boolean>;
}

export class BleSimulatedTransportDriver implements TransportDriver {
  name = 'Bluetooth Low Energy (BLE Sim/WebBluetooth)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async discoverPeers(): Promise<MeshNode[]> {
    meshEventBus.emit('transportScanStarted');
    await new Promise((resolve) => setTimeout(resolve, 400));
    meshEventBus.emit('transportScanCompleted');
    return [];
  }

  async startAdvertising(localNode: MeshNode): Promise<boolean> {
    console.log(`[BleTransport] Advertising BLE Service UUID: 0000PRV0-0000-1000-8000-00805F9B34FB as ${localNode.nodeId}`);
    return true;
  }

  async stopAdvertising(): Promise<void> {
    console.log(`[BleTransport] Stopped BLE advertising.`);
  }

  async connect(targetNodeId: string): Promise<boolean> {
    console.log(`[BleTransport] Establishing GATT connection to ${targetNodeId}...`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  }

  async disconnect(targetNodeId: string): Promise<void> {
    console.log(`[BleTransport] Disconnected from ${targetNodeId}.`);
  }

  async sendMessage(targetNodeId: string, message: MeshMessage): Promise<boolean> {
    console.log(`[BleTransport] Transmitting GATT Characteristic Write to ${targetNodeId}: ${message.messageId}`);
    meshEventBus.emit('packetTransmitting', { targetNodeId, messageId: message.messageId });
    await new Promise((resolve) => setTimeout(resolve, 300));
    meshEventBus.emit('packetTransmitted', { targetNodeId, messageId: message.messageId });
    return true;
  }
}

export class TransportManager {
  private activeDriver: TransportDriver;
  private realBleDriver: RealWebBluetoothDriver;
  private realRtcDriver: RealWebRTCChannelDriver;
  private localNode: MeshNode;
  private onIncomingMessageCallback?: (msg: MeshMessage) => void;

  constructor(localNode: MeshNode) {
    this.localNode = localNode;
    this.realBleDriver = new RealWebBluetoothDriver();
    this.realRtcDriver = realWebRTCChannelDriver;
    this.activeDriver = this.realRtcDriver; // Default to WebRTC/BroadcastChannel for instant multi-device physical pairing

    // Listen to real physical peer messages
    this.realRtcDriver.setMessageHandler((msg: MeshMessage) => {
      if (this.onIncomingMessageCallback) {
        this.onIncomingMessageCallback(msg);
      }
    });
  }

  setIncomingMessageHandler(handler: (msg: MeshMessage) => void) {
    this.onIncomingMessageCallback = handler;
  }

  async initialize(): Promise<boolean> {
    const rtcAvailable = await this.realRtcDriver.isAvailable();
    if (rtcAvailable) {
      await this.realRtcDriver.startAdvertising(this.localNode);
    }
    return rtcAvailable;
  }

  async discoverPeers(): Promise<MeshNode[]> {
    const rtcPeers = await this.realRtcDriver.discoverPeers();
    const blePeers = await this.realBleDriver.discoverPeers();
    return [...rtcPeers, ...blePeers];
  }

  async connectPeer(targetNodeId: string): Promise<boolean> {
    return await this.activeDriver.connect(targetNodeId);
  }

  async sendPeerMessage(targetNodeId: string, message: MeshMessage): Promise<boolean> {
    // Send over both active driver and real physical WebRTC/BroadcastChannel
    await this.realRtcDriver.sendMessage(targetNodeId, message);
    return await this.activeDriver.sendMessage(targetNodeId, message);
  }
}
