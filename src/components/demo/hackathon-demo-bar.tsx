import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Minimize2,
  Maximize2,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HACKATHON_DEMO_STEPS, resetHackathonDemoScenario, type DemoStep } from '@/mocks/demoScenario'

export function HackathonDemoBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [minimized, setMinimized] = useState(() => {
    return localStorage.getItem('commitcheck-demo-bar-minimized') === 'true'
  })

  // Detect matching step from URL
  useEffect(() => {
    const matched = HACKATHON_DEMO_STEPS.findIndex((s) => {
      if (s.path === location.pathname) return true
      if (s.step === 7 && location.pathname.startsWith('/commitments/comm-google-login')) return true
      return false
    })
    if (matched >= 0) {
      setCurrentStepIndex(matched)
    }
  }, [location.pathname])

  const step: DemoStep = HACKATHON_DEMO_STEPS[currentStepIndex]

  const handleNext = () => {
    if (currentStepIndex < HACKATHON_DEMO_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1
      setCurrentStepIndex(nextIdx)
      navigate(HACKATHON_DEMO_STEPS[nextIdx].path)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1
      setCurrentStepIndex(prevIdx)
      navigate(HACKATHON_DEMO_STEPS[prevIdx].path)
    }
  }

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index)
    navigate(HACKATHON_DEMO_STEPS[index].path)
  }

  const handleReset = () => {
    resetHackathonDemoScenario()
    setCurrentStepIndex(0)
    navigate(HACKATHON_DEMO_STEPS[0].path)
    toast.success('Hackathon demo scenario reset to initial baseline!')
  }

  const toggleMinimized = () => {
    setMinimized((prev) => {
      const next = !prev
      localStorage.setItem('commitcheck-demo-bar-minimized', String(next))
      return next
    })
  }

  // Floating trigger when minimized
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
        <Button
          onClick={toggleMinimized}
          size="sm"
          className="h-10 px-3.5 gap-2 rounded-full shadow-xl border border-primary/30 bg-primary text-primary-foreground font-semibold hover:shadow-primary/20 hover:scale-105 transition-all"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          <span className="text-xs">Demo Guide</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-background/20 text-primary-foreground border-white/20">
            {step.step}/8
          </Badge>
          <Maximize2 className="h-3.5 w-3.5 ml-1 opacity-70" />
        </Button>
      </div>
    )
  }

  return (
    <aside aria-label="Hackathon Demo Guide" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl animate-slide-up">
      <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-3 sm:p-4 shadow-2xl transition-all">
        {/* Top Mini Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Hackathon Walkthrough Guide &bull; {step.prdReference}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              title="Reset mock data to initial unapproved state"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset Demo</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimized}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Minimize guide bar"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Step Indicator & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Step Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge className="h-5 px-2 text-[10px] font-bold bg-primary text-primary-foreground">
                Step {step.step} of 8
              </Badge>
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {step.title}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {step.subtitle}
            </p>
            <p className="text-[11px] text-primary/90 font-medium mt-1 flex items-center gap-1.5">
              <Play className="h-3 w-3 shrink-0" />
              <span>{step.actionHint}</span>
            </p>
          </div>

          {/* Stepper Buttons & Quick Steps */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {/* Quick Step Indicators (dots) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              {HACKATHON_DEMO_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => handleJumpToStep(idx)}
                  className={cn(
                    'h-2 rounded-full transition-all cursor-pointer',
                    idx === currentStepIndex
                      ? 'w-6 bg-primary'
                      : idx < currentStepIndex
                        ? 'w-2 bg-emerald-500/80 hover:bg-emerald-500'
                        : 'w-2 bg-muted hover:bg-muted-foreground/40',
                  )}
                  title={`Step ${s.step}: ${s.title}`}
                  aria-label={`Jump to Step ${s.step}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="h-8 px-2.5 text-xs gap-1 border-border/80"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              disabled={currentStepIndex === HACKATHON_DEMO_STEPS.length - 1}
              className="h-8 px-3 text-xs gap-1 font-semibold shadow-xs"
            >
              <span>{currentStepIndex === HACKATHON_DEMO_STEPS.length - 1 ? 'Complete' : 'Next Step'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
