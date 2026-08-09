import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";
import Partner from "./pages/Partner";
import PartnerDashboard from "./pages/PartnerDashboard";
import Gallows from "./pages/Gallows";
import Architecture from "./pages/Architecture";
import SDK from "./pages/SDK";
import Compare from "./pages/Compare";
import Verify from "./pages/Verify";
import BadgePage from "./pages/Badge";
import FreeAssessment from "./pages/FreeAssessment";
import Regulations from "./pages/Regulations";
import ScoreCard from "./pages/ScoreCard";
import EmbedCountdown from "./pages/EmbedCountdown";
import EmbedPulse from "./pages/EmbedPulse";
import Lattice from "./pages/Lattice";
import Admin from "./pages/Admin";
import Master from "./pages/Master";
import SiloDashboard from "./pages/SiloDashboard";
import Protocol from "./pages/Protocol";
import Registry from "./pages/Registry";
import SubmissionKit from "./pages/SubmissionKit";
import IETFDraft from "./pages/IETFDraft";
import Paper from "./pages/Paper";
import Notary from "./pages/Notary";
import Explorer from "./pages/Explorer";
import Receipt from "./pages/Receipt";
import VendorCheck from "./pages/VendorCheck";
import LiveLedger from "./pages/LiveLedger";
import Tribunal from "./pages/Tribunal";
import Governance from "./pages/Governance";
import Research from "./pages/Research";
import Standards from "./pages/Standards";

import Landscape from "./pages/Landscape";
import PatentPledge from "./pages/PatentPledge";
import API from "./pages/API";
import Challenge from "./pages/Challenge";
import Pramaan from "./pages/Pramaan";
import UniversalSeal from "./pages/UniversalSeal";
import EmbedSeal from "./pages/EmbedSeal";
import Forge from "./pages/Forge";
import Standard from "./pages/Standard";
import Spec from "./pages/Spec";
import Header from "./pages/Header";
import Foundation from "./pages/Foundation";
import EUAIAct from "./pages/EUAIAct";
import InBand from "./pages/InBand";
import Hardening from "./pages/Hardening";
import Quantum from "./pages/Quantum";
import Articles from "./pages/Articles";
import Article from "./pages/Article";
import AGILedger from "./pages/AGILedger";
import ModelRegistry from "./pages/ModelRegistry";
import Regulator from "./pages/Regulator";
import Cite from "./pages/Cite";
import WitnessWall from "./pages/WitnessWall";
import Gallery from "./pages/Gallery";




import ChatWidget from "@/components/chat/ChatWidget";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import FeedbackWidget from "@/components/FeedbackWidget";
import CanonicalDomainRedirect from "@/components/CanonicalDomainRedirect";
import { usePageTracker } from "@/hooks/use-page-tracker";

const queryClient = new QueryClient();

function PageTracker() {
  usePageTracker();
  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CanonicalDomainRedirect />
            <ScrollToTop />
            <PageTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/home" element={<Index />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/protocol" element={<Protocol />} />
              <Route path="/gallows" element={<Gallows />} />
              <Route path="/notary" element={<Notary />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/live" element={<LiveLedger />} />
              <Route path="/architecture" element={<Architecture />} />
              <Route path="/sdk" element={<SDK />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/badge" element={<BadgePage />} />
              <Route path="/assess" element={<FreeAssessment />} />
              <Route path="/regulations" element={<Regulations />} />
              <Route path="/score/:shareId" element={<ScoreCard />} />
              <Route path="/embed/countdown" element={<EmbedCountdown />} />
              <Route path="/embed/pulse/:id" element={<EmbedPulse />} />
              <Route path="/lattice" element={<Lattice />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/master"
                element={
                  <ProtectedRoute>
                    <Master />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/silo"
                element={
                  <ProtectedRoute>
                    <SiloDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/registry" element={<Registry />} />
              <Route path="/registry/check" element={<VendorCheck />} />
              <Route path="/r/:hash" element={<Receipt />} />
              <Route path="/submission-kit" element={<SubmissionKit />} />
              <Route path="/draft" element={<IETFDraft />} />
              <Route path="/paper" element={<Paper />} />
              <Route
                path="/tribunal"
                element={
                  <ProtectedRoute>
                    <Tribunal />
                  </ProtectedRoute>
                }
              />
              <Route path="/governance" element={<Governance />} />
              <Route path="/research" element={<Research />} />
              <Route path="/standards" element={<Standards />} />
              
              <Route path="/landscape" element={<Landscape />} />
              <Route path="/pledge" element={<PatentPledge />} />
              <Route path="/api" element={<API />} />
              <Route path="/challenge" element={<Challenge />} />
              <Route path="/pramaan" element={<Pramaan />} />
              <Route path="/seal" element={<UniversalSeal />} />
              <Route path="/embed/seal" element={<EmbedSeal />} />
              <Route path="/forge" element={<Forge />} />
              <Route path="/standard" element={<Standard />} />
              <Route path="/spec" element={<Spec />} />
              <Route path="/header" element={<Header />} />
              <Route path="/foundation" element={<Foundation />} />
              <Route path="/eu-ai-act" element={<EUAIAct />} />
              <Route path="/inband" element={<InBand />} />
              <Route path="/hardening" element={<Hardening />} />
              <Route path="/quantum" element={<Quantum />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<Article />} />
              <Route path="/agi-ledger" element={<AGILedger />} />
              <Route path="/models" element={<ModelRegistry />} />
              <Route path="/regulator" element={<Regulator />} />
              <Route path="/cite" element={<Cite />} />
              <Route path="/witness-wall" element={<WitnessWall />} />
              <Route path="/gallery" element={<Gallery />} />
              
              
              
              <Route path="/partner" element={<Partner />} />
              <Route
                path="/partner/dashboard"
                element={
                  <ProtectedRoute>
                    <PartnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ExitIntentPopup />
            <ChatWidget />
            <FeedbackWidget />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
