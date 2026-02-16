import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - branding */}
      <div className="hidden w-[45%] items-center justify-center bg-sidebar-bg lg:flex">
        <div className="max-w-md px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FacMan</span>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-sidebar-text">
            Manage all your Facebook pages from one powerful dashboard. Schedule posts, track analytics, and engage with your audience.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "Unified page management",
              "Smart post scheduling",
              "Real-time analytics",
              "Team collaboration",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-sm text-sidebar-text">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
