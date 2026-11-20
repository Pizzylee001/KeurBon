import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useKeurBonStore } from './state/store';
import { OverviewPage } from './pages/OverviewPage';
import { IssuePage } from './pages/IssuePage';
import { RedeemPage } from './pages/RedeemPage';
import { LedgerPage } from './pages/LedgerPage';
import { VendorsPage } from './pages/VendorsPage';

function NotFoundRoute() {
  const { t } = useKeurBonStore();
  return (
    <section className="kb-animate-enter py-12">
      <h1 className="type-h1 text-[#0E1E2B]">{t.notFound.title}</h1>
      <p className="type-body-large mt-3 text-[#3D515F]">
        {t.notFound.description}
      </p>
      <div className="mt-6">
        <Link to="/" className="kb-btn-primary no-underline">
          {t.notFound.backHomeCta}
        </Link>
      </div>
    </section>
  );
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/issue" element={<IssuePage />} />
        <Route path="/redeem" element={<RedeemPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </Layout>
  );
}

export default App;
