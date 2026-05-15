import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext';
import { getMetaConnectUrl, getYouTubeConnectUrl } from '../services/connect';
import { fetchOnboardingSocialStatus } from '../services/onboarding';

const steps = [
  { id: 'identity', label: 'Creator Identity' },
  { id: 'goals', label: 'Goals' },
  { id: 'ai', label: 'AI Preferences' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'finish', label: 'Finish' },
] as const;

type StepId = (typeof steps)[number]['id'];

type StepProps = {
  step: StepId;
};

function OnboardingContent({ step }: StepProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const {
    loading,
    error,
    data,
    currentStep,
    completedSteps,
    setCurrentStep,
    updateData,
    markStepComplete,
    complete,
  } = useOnboarding();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Array<{ platform: string; status: string }>>([]);
  const [connectLoading, setConnectLoading] = useState(false);

  const stepIndex = useMemo(() => steps.findIndex((s) => s.id === currentStep), [currentStep]);
  const connectedPlatforms = useMemo(
    () => new Set(connections.map((item) => item.platform.toLowerCase())),
    [connections],
  );

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const status = await fetchOnboardingSocialStatus();
        setConnections(status.connections.map((conn) => ({ platform: conn.platform, status: conn.status })));
      } catch (err) {
        setConnectError(err instanceof Error ? err.message : 'Failed to load connections');
      }
    };

    fetchConnections();
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (!connected) return;
    setConnectError(null);
    const refreshConnections = async () => {
      try {
        const status = await fetchOnboardingSocialStatus();
        setConnections(status.connections.map((conn) => ({ platform: conn.platform, status: conn.status })));
      } catch {
        return;
      }
    };

    refreshConnections();
  }, [searchParams]);

  function goNext() {
    markStepComplete(currentStep);
    const nextStep = steps[Math.min(stepIndex + 1, steps.length - 1)].id;
    setCurrentStep(nextStep);
  }

  function goBack() {
    const prevStep = steps[Math.max(stepIndex - 1, 0)].id;
    setCurrentStep(prevStep);
  }

  async function handleComplete() {
    await complete();
    await refreshProfile();
    navigate('/dashboard');
  }

  async function handleConnect(provider: 'youtube' | 'meta') {
    setConnectLoading(true);
    setConnectError(null);
    try {
      const url = provider === 'youtube' ? await getYouTubeConnectUrl() : await getMetaConnectUrl();
      window.location.href = url;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to start connection');
      setConnectLoading(false);
    }
  }

  if (loading) {
    return <div className="card"><p>Loading onboarding...</p></div>;
  }

  return (
    <div className="card">
      <header>
        <h1>{steps.find((s) => s.id === step)?.label}</h1>
        <p className="muted">Tell CreatorOS how to personalize your workflow.</p>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {step === 'identity' && (
        <section>
          <label>
            What niche best describes your content?
            <input
              value={data.niche}
              onChange={(e) => updateData({ niche: e.target.value })}
              placeholder="e.g. fitness, design, finance"
            />
          </label>
          <label>
            What is your creator style?
            <input
              value={data.global_strategy}
              onChange={(e) => updateData({ global_strategy: e.target.value })}
              placeholder="e.g. tutorials, commentary, daily vlogs"
            />
          </label>
        </section>
      )}

      {step === 'goals' && (
        <section>
          <label>
            What are you trying to achieve?
            <input
              value={data.creator_goal}
              onChange={(e) => updateData({ creator_goal: e.target.value })}
              placeholder="e.g. grow audience, monetize expertise"
            />
          </label>
          <label>
            Posting frequency goal (per week)
            <input
              type="number"
              value={data.posting_frequency_goal ?? ''}
              onChange={(e) => updateData({ posting_frequency_goal: Number(e.target.value) || null })}
              placeholder="3"
            />
          </label>
        </section>
      )}

      {step === 'ai' && (
        <section>
          <label>
            AI coaching style
            <input
              value={(data.ai_behavior?.style as string) || ''}
              onChange={(e) => updateData({ ai_behavior: { ...data.ai_behavior, style: e.target.value } })}
              placeholder="e.g. direct, supportive, strategic"
            />
          </label>
          <label>
            Proactivity level (1-5)
            <input
              type="number"
              value={(data.ai_settings?.proactivity_level as number | undefined) ?? ''}
              onChange={(e) => updateData({
                ai_settings: {
                  ...data.ai_settings,
                  proactivity_level: Number(e.target.value) || null,
                },
              })}
              placeholder="3"
            />
          </label>
        </section>
      )}

      {step === 'platforms' && (
        <section>
          <p className="muted">Choose platforms you plan to connect. OAuth comes later.</p>
          <p className="muted">Instagram insights require a connected Facebook Page.</p>
          {connectError ? <p className="error">{connectError}</p> : null}
          <div className="grid">
            <button
              type="button"
              onClick={() => handleConnect('youtube')}
              disabled={connectLoading}
              className={connectedPlatforms.has('youtube') ? '' : 'ghost'}
            >
              {connectedPlatforms.has('youtube') ? 'Connected' : 'Connect'} YouTube
            </button>
            <button
              type="button"
              onClick={() => handleConnect('meta')}
              disabled={connectLoading}
              className={connectedPlatforms.has('instagram') || connectedPlatforms.has('facebook') ? '' : 'ghost'}
            >
              {connectedPlatforms.has('instagram') || connectedPlatforms.has('facebook') ? 'Connected' : 'Connect'} Instagram
            </button>
            <button type="button" disabled className="ghost">
              Coming Soon TikTok
            </button>
            <button
              type="button"
              onClick={() => handleConnect('meta')}
              disabled={connectLoading}
              className={connectedPlatforms.has('facebook') ? '' : 'ghost'}
            >
              {connectedPlatforms.has('facebook') ? 'Connected' : 'Connect'} Facebook
            </button>
          </div>
        </section>
      )}

      {step === 'finish' && (
        <section>
          <h3>Ready to launch CreatorOS</h3>
          <p className="muted">We’ll finish setting up your workspace and dashboard.</p>
          <ul>
            <li>Niche: {data.niche || 'Not set'}</li>
            <li>Goal: {data.creator_goal || 'Not set'}</li>
            <li>Platforms: {data.platforms.length ? data.platforms.join(', ') : 'None yet'}</li>
          </ul>
        </section>
      )}

      <footer className="actions">
        <button type="button" className="ghost" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        {step === 'finish' ? (
          <button type="button" onClick={handleComplete}>
            Complete onboarding
          </button>
        ) : (
          <button type="button" onClick={goNext}>
            Next
          </button>
        )}
      </footer>

      <div className="muted" style={{ marginTop: '1rem' }}>
        Step {stepIndex + 1} of {steps.length} · Completed {completedSteps.length}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <main className="page">
        <section className="card hero">
          <div>
            <p className="eyebrow">CreatorOS</p>
            <h1>Let’s personalize your CreatorOS</h1>
            <p className="muted">This flow adapts to your creative process. You can resume anytime.</p>
          </div>
        </section>
        <OnboardingSteps />
      </main>
    </OnboardingProvider>
  );
}

function OnboardingSteps() {
  const { currentStep, setCurrentStep } = useOnboarding();

  return (
    <section>
      <div className="actions" style={{ marginBottom: '1rem' }}>
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            className={currentStep === step.id ? '' : 'ghost'}
            onClick={() => setCurrentStep(step.id)}
          >
            {step.label}
          </button>
        ))}
      </div>
      <OnboardingContent step={currentStep} />
    </section>
  );
}
