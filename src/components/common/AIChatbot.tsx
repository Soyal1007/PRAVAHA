import React, { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ isOpen, onClose }) => {
  const { roads, weatherEvents, shipments, vehicles } = useAppState();
  const { currentUser } = useAuth();

  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: `Hello ${currentUser?.name?.split(' ')[0] ?? 'there'}! I am the PRAVAHA AI Assistant. Ask me about road conditions, shipment rerouting, weather risks, or how to use any feature!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Is NH-10 open?',
        'How to reroute a shipment?',
        'Show blocked corridors',
        'How to report a situation?',
      ],
    },
  ]);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    setTimeout(() => {
      const botReply = generateBotResponse(query.toLowerCase());
      setMessages((prev) => [...prev, botReply]);
    }, 600);
  };

  const generateBotResponse = (q: string): ChatMessage => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Road Status
    if (q.includes('nh-10') || q.includes('nh10') || q.includes('sevoke') || q.includes('gangtok')) {
      const nh10 = roads.find((r) => r.roadName.includes('NH-10'));
      const status = nh10?.status ?? 'Unknown';
      const cause = nh10?.causeOfDisruption ?? 'Landslide at Sevoke';
      const colour = status === 'Blocked' ? '🔴' : status === 'Restricted' ? '🟡' : '🟢';
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `${colour} NH-10 (Siliguri – Gangtok) Status: ${status.toUpperCase()}\n\nRisk Score: ${nh10?.riskScore ?? 88}/100\nCause: ${cause}\n\nRecommendation: Use NH-27 / NH-37 Alternate Bypass instead (+45 min but fully safe).`,
        timestamp: now,
        suggestions: ['How to reroute PRV-9042?', 'View Live Map', 'Report situation on NH-10'],
      };
    }

    if (q.includes('blocked') || q.includes('road') || q.includes('corridor') || q.includes('highway')) {
      const blocked = roads.filter((r) => r.status === 'Blocked' || r.status === 'Restricted');
      const lines =
        blocked.length > 0
          ? blocked.map((r) => `• ${r.roadName}: ${r.status} (${r.causeOfDisruption ?? 'High Risk'})`).join('\n')
          : '• All monitored corridors are currently OPEN and clear.';
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Current Road Disruptions (${blocked.length} active):\n\n${lines}\n\nYou can see all marked road conditions with colour codes directly on the Live Map view.`,
        timestamp: now,
        suggestions: ['Is NH-10 open?', 'Check weather warnings', 'Open Live Map'],
      };
    }

    // Reroute help
    if (q.includes('reroute') || q.includes('route') || q.includes('prv-')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `How to reroute a cargo shipment:\n\n1. Open RouteGuard from the left sidebar.\n2. Select the affected shipment from the dropdown.\n3. Review alternate corridors scored by risk engine.\n4. Click "Apply Reroute" to dispatch updated navigation to the driver's cab.\n\nShipment PRV-9042 (Emergency Grain) is currently trapped on NH-10 and needs rerouting.`,
        timestamp: now,
        suggestions: ['Open RouteGuard', 'Check NH-10 status'],
      };
    }

    // Report
    if (q.includes('report') || q.includes('situation') || q.includes('incident') || q.includes('landslide')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `To report a road situation or hazard:\n\n1. Click the orange "Report Situation" button in the header (top bar).\n2. Select the affected road segment from the dropdown.\n3. Choose incident type (Landslide, Flood, Road Damage, etc.).\n4. Add description and submit.\n\nThis works even in offline mode — reports are queued locally and auto-sync when network returns.`,
        timestamp: now,
        suggestions: ['How does offline sync work?', 'Show blocked corridors'],
      };
    }

    // Weather
    if (q.includes('weather') || q.includes('rain') || q.includes('flood')) {
      const extreme = weatherEvents.filter((w) => w.floodRisk === 'High' || w.floodRisk === 'Extreme');
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Weather Risk Intelligence:\n\n${extreme.length} high-risk weather zone(s) active.\n• Teesta Valley, Sikkim: Torrential Downpour (${extreme[1]?.rainfallMmHr ?? 72} mm/hr) — Extreme Flood Risk\n• Senapati Ridge, Manipur: Heavy Rain (${extreme[0]?.rainfallMmHr ?? 48} mm/hr) — High Flood Risk\n\nNH-10 is highly exposed. Use WeatherCore view for real-time forecasts.`,
        timestamp: now,
        suggestions: ['Open Weather Core', 'Is NH-10 open?'],
      };
    }

    // Login / portal help
    if (q.includes('login') || q.includes('access') || q.includes('panel') || q.includes('role')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `PRAVAHA has 5 distinct role-based login portals:\n\n• Driver: driver@pravaha.gov.in / driver123\n• Field Officer: officer@pravaha.gov.in / officer123\n• Logistics Admin: admin@pravaha.gov.in / admin123\n• Operator: operator@pravaha.gov.in / operator123\n• Authority (NDMA): authority@ndma.gov.in / authority123\n\nEach role gets a fully isolated workspace with different permissions.`,
        timestamp: now,
        suggestions: ['What features does the Driver panel have?', 'How to report a situation?'],
      };
    }

    // Feature help
    if (q.includes('feature') || q.includes('what') || q.includes('help') || q.includes('use')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `PRAVAHA Key Features:\n\n• Live GIS Map with colour-coded road conditions\n• RouteGuard AI dynamic rerouting\n• FleetPulse real-time cab telemetry\n• FieldLink offline incident reports\n• AlertNet critical alert dispatch\n• Analytics with pie charts & bar charts\n• SupplyGrid hospital stock monitoring\n• AI Chatbot (that's me!)\n• Role-separated login panels for 5 user types`,
        timestamp: now,
        suggestions: ['Show blocked corridors', 'How to reroute a shipment?', 'Login help'],
      };
    }

    // Default
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `I understand your query about "${q.substring(0, 40)}..."\n\nI can help with:\n• Road blockage status\n• Shipment rerouting steps\n• Weather & flood risk\n• How to report incidents\n• Login panel credentials\n• Any PRAVAHA feature explanation\n\nWhat would you like to know?`,
      timestamp: now,
      suggestions: ['Is NH-10 open?', 'Login help', 'How to report a situation?'],
    };
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: '500px' }}>
      {/* Header */}
      <div className="bg-[#087F8C] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-white/15 rounded-lg">
            <Bot className="w-4 h-4 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm">PRAVAHA AI</span>
              <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 rounded-full uppercase">
                Live
              </span>
            </div>
            <p className="text-[10px] text-teal-100/80">GIS-Connected Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] p-2.5 rounded-xl leading-relaxed whitespace-pre-line shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#087F8C] text-white rounded-tr-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
              }`}
            >
              {msg.text}
              <div className={`text-[9px] mt-1 text-right font-mono ${msg.sender === 'user' ? 'text-teal-100/70' : 'text-slate-400'}`}>
                {msg.timestamp}
              </div>
            </div>

            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[95%]">
                {msg.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug)}
                    className="bg-white hover:bg-teal-50 text-[#087F8C] border border-teal-200 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about roads, routes, or features..."
          className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#087F8C] focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-[#087F8C] hover:bg-[#075E68] disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
