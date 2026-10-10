import { useState } from 'react'
import {
  User,
  Building,
  Palette,
  Bell,
  Sliders,
  Check,
  Sun,
  Moon,
  Laptop,
  Save,
  DollarSign,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  // Tab State
  const [activeTab, setActiveTab] = useState('profile')

  // Profile Form State
  const [fullName, setFullName] = useState(user?.name || 'Rahul Mehta')
  const [email, setEmail] = useState(user?.email || 'rahul@pixelforge.io')
  const [role, setRole] = useState('Lead Solutions Architect & Tech Lead')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Organization Form State
  const [orgName, setOrgName] = useState(user?.organization || 'PixelForge Studios')
  const [hourlyRate, setHourlyRate] = useState('125')
  const [currency, setCurrency] = useState('USD')
  const [workspaceDomain, setWorkspaceDomain] = useState('pixelforge.commitcheck.app')

  // Notification Toggles
  const [notifHighRisk, setNotifHighRisk] = useState(true)
  const [notifUnauthorized, setNotifUnauthorized] = useState(true)
  const [notifCrApproval, setNotifCrApproval] = useState(true)
  const [notifCrDecision, setNotifCrDecision] = useState(true)
  const [notifDailyDigest, setNotifDailyDigest] = useState(false)

  // Engine Preferences
  const [aiSensitivity, setAiSensitivity] = useState<'strict' | 'balanced' | 'relaxed'>('balanced')
  const [defaultProjectTab, setDefaultProjectTab] = useState('commitments')
  const [autoFormatTranscript, setAutoFormatTranscript] = useState(true)
  const [requireConfirmation, setRequireConfirmation] = useState(true)

  const handleSave = (section: string) => {
    toast.success(`${section} settings saved successfully!`)
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Settings & Preferences
            </h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
              Workspace Config
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Configure your agency identity, contractual billing rates, theme appearance, and scope verification thresholds.
          </p>
        </div>

        <Button
          onClick={() => handleSave('Workspace')}
          className="gap-2 shadow-sm font-semibold self-start sm:self-auto text-xs"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span>Save Changes</span>
        </Button>
      </div>

      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10 p-1 bg-muted/60 border border-border/60 rounded-xl grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="profile" className="text-xs gap-1.5 font-medium">
            <User className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="text-xs gap-1.5 font-medium">
            <Building className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Organization</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="text-xs gap-1.5 font-medium">
            <Palette className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Theme & Display</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5 font-medium">
            <Bell className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs gap-1.5 font-medium">
            <Sliders className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>AI Engine</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Settings */}
        <TabsContent value="profile" className="space-y-6 m-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Personal Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Your name and title are attached to meeting commitment reviews and change orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Job Title / Role</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Separator />

              {/* Password Section */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.8} /> Security & Password
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Current Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => handleSave('Profile')} className="text-xs">
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Organization Settings */}
        <TabsContent value="organization" className="space-y-6 m-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Agency & Billing Baseline
              </CardTitle>
              <CardDescription className="text-xs">
                Defaults used when calculating scope creep financial impact and generating change requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Name</label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Workspace Subdomain</label>
                  <Input
                    value={workspaceDomain}
                    onChange={(e) => setWorkspaceDomain(e.target.value)}
                    className="text-xs font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                    Standard Blended Hourly Rate
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">$</span>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="text-xs"
                    />
                    <span className="text-xs text-muted-foreground font-mono">/ hour</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Default Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD" className="text-xs">USD ($) — United States Dollar</SelectItem>
                      <SelectItem value="EUR" className="text-xs">EUR (€) — Euro</SelectItem>
                      <SelectItem value="GBP" className="text-xs">GBP (£) — British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong>Automatic Scope Exposure Calculation:</strong> When CommitCheck extracts an unauthorized commitment, it estimates engineering effort and multiplies by your blended rate (${hourlyRate}/hr) to alert your PM of unrecovered financial exposure.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => handleSave('Organization')} className="text-xs">
                  Save Agency Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Theme & Display Settings (PRD §25: Light, Dark, System) */}
        <TabsContent value="theme" className="space-y-6 m-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Theme & Interface Appearance
              </CardTitle>
              <CardDescription className="text-xs">
                Select your preferred visual mode with smooth circle blur transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light Mode Card */}
                <div
                  onClick={() => setTheme('light')}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5 shadow-2xs'
                      : 'border-border/80 bg-card hover:border-border'
                  }`}
                >
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-inner h-28 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-12 rounded-sm bg-zinc-200" />
                      <div className="h-2 w-6 rounded-sm bg-zinc-300" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-sm bg-zinc-100" />
                      <div className="h-2 w-3/4 rounded-sm bg-zinc-200" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-blue-500" />
                      <div className="h-2 w-8 rounded-sm bg-zinc-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Light Mode</span>
                    </div>
                    {theme === 'light' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5 shadow-2xs'
                      : 'border-border/80 bg-card hover:border-border'
                  }`}
                >
                  <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-inner h-28 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-12 rounded-sm bg-zinc-800" />
                      <div className="h-2 w-6 rounded-sm bg-zinc-700" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-sm bg-zinc-900" />
                      <div className="h-2 w-3/4 rounded-sm bg-zinc-800" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-blue-500" />
                      <div className="h-2 w-8 rounded-sm bg-zinc-700" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Moon className="h-3.5 w-3.5 text-blue-400" />
                      <span>Dark Mode</span>
                    </div>
                    {theme === 'dark' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* System Mode Card */}
                <div
                  onClick={() => setTheme('system')}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5 shadow-2xs'
                      : 'border-border/80 bg-card hover:border-border'
                  }`}
                >
                  <div className="rounded-xl border border-border/80 bg-linear-to-r from-white via-zinc-200 to-zinc-900 p-3 shadow-inner h-28 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-12 rounded-sm bg-zinc-400" />
                      <div className="h-2 w-6 rounded-sm bg-zinc-500" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                      <div className="h-2 w-3/4 rounded-sm bg-zinc-400 dark:bg-zinc-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-primary" />
                      <div className="h-2 w-8 rounded-sm bg-zinc-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>System Automatic</span>
                    </div>
                    {theme === 'system' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">Current Active Theme</p>
                  <p className="text-[11px] text-muted-foreground">
                    Operating system sync: {theme === 'system' ? 'Enabled' : 'Disabled (Forced ' + theme + ')'}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold capitalize">
                  {theme}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Notifications Settings (PRD §24) */}
        <TabsContent value="notifications" className="space-y-6 m-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Notification Alerts & Triggers
              </CardTitle>
              <CardDescription className="text-xs">
                Control when CommitCheck delivers immediate notifications and email alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-border/60 space-y-3">
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">High-Risk Scope Creep Alerts</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Instant notifications when a commitment is detected without approved SOW coverage.
                    </p>
                  </div>
                  <Switch checked={notifHighRisk} onCheckedChange={setNotifHighRisk} />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Unauthorized Promises Flagged</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Notify the team lead when promises have no signed contract addendum on record.
                    </p>
                  </div>
                  <Switch checked={notifUnauthorized} onCheckedChange={setNotifUnauthorized} />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Change Request Awaiting Approval</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Alert project managers when client change orders are submitted for sign-off.
                    </p>
                  </div>
                  <Switch checked={notifCrApproval} onCheckedChange={setNotifCrApproval} />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Change Request Approvals & Rejections</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Notify developers when a client signs or rejects a requested scope addendum.
                    </p>
                  </div>
                  <Switch checked={notifCrDecision} onCheckedChange={setNotifCrDecision} />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Daily Morning Scope Digest</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Receive a daily summary of analyzed meetings and pending approvals at 9:00 AM.
                    </p>
                  </div>
                  <Switch checked={notifDailyDigest} onCheckedChange={setNotifDailyDigest} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => handleSave('Notification')} className="text-xs">
                  Save Alert Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. AI Engine & Preferences */}
        <TabsContent value="preferences" className="space-y-6 m-0">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Verification Engine Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Fine-tune commitment detection thresholds and project navigation behaviors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  AI Commitment Detection Sensitivity
                </label>
                <Select value={aiSensitivity} onValueChange={(v) => setAiSensitivity(v as any)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict" className="text-xs">
                      Strict — Flags all tentative client requests and developer promises
                    </SelectItem>
                    <SelectItem value="balanced" className="text-xs">
                      Balanced (Recommended) — Flags firm promises and definitive deliverables
                    </SelectItem>
                    <SelectItem value="relaxed" className="text-xs">
                      Relaxed — Only flags promises with specific calendar deadlines
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Default Project Landing Tab
                </label>
                <Select value={defaultProjectTab} onValueChange={setDefaultProjectTab}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commitments" className="text-xs">Commitments Inventory</SelectItem>
                    <SelectItem value="overview" className="text-xs">Project Overview & Stats</SelectItem>
                    <SelectItem value="scope" className="text-xs">Approved Scope Explorer</SelectItem>
                    <SelectItem value="meetings" className="text-xs">Meeting Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Auto-Format Transcript Quotes</p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically highlight timestamps and speaker tags in evidence view.
                    </p>
                  </div>
                  <Switch checked={autoFormatTranscript} onCheckedChange={setAutoFormatTranscript} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 max-w-lg">
                    <p className="text-xs font-bold text-foreground">Require Confirmation for Baseline Overrides</p>
                    <p className="text-[11px] text-muted-foreground">
                      Prompt before manually marking an unauthorized commitment as authorized.
                    </p>
                  </div>
                  <Switch checked={requireConfirmation} onCheckedChange={setRequireConfirmation} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => handleSave('AI Engine')} className="text-xs">
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
