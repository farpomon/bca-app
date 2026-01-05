import { ModernSidebar } from "@/components/ModernSidebar";

/**
 * Demo page to showcase the modern sidebar design
 * This demonstrates the improved UI with:
 * - Search functionality at the top
 * - Consistent icons throughout
 * - Better visual hierarchy with collapsible sections
 * - Clean blue-white color scheme
 * - Rounded buttons and modern styling
 * - Higher contrast for better readability
 */
export default function SidebarDemo() {
  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Modern Sidebar Design
            </h1>
            
            <div className="prose prose-blue max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Key Improvements
              </h2>
              
              <div className="grid gap-4 mt-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Search Functionality</h3>
                    <p className="text-sm text-gray-600">
                      Quick search bar at the top allows users to instantly find any menu item, improving navigation efficiency.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Consistent Icons</h3>
                    <p className="text-sm text-gray-600">
                      Every menu item has a clear, recognizable icon from Lucide React, making navigation more intuitive and visually appealing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Better Grouping</h3>
                    <p className="text-sm text-gray-600">
                      Collapsible sections (Analytics & Reports, Sustainability & ESG, Administration) organize related items logically with expand/collapse controls.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Clean Blue-White Theme</h3>
                    <p className="text-sm text-gray-600">
                      Professional color scheme with blue (#3B82F6) for active states and clean white background, similar to Slack and Notion.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    5
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Higher Contrast</h3>
                    <p className="text-sm text-gray-600">
                      Improved text contrast (gray-700 for inactive, white on blue for active) ensures better readability and accessibility.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    6
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Rounded Buttons</h3>
                    <p className="text-sm text-gray-600">
                      Modern rounded corners (rounded-lg) on all interactive elements create a softer, more contemporary look.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    7
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">User Profile Footer</h3>
                    <p className="text-sm text-gray-600">
                      Clean user profile section at the bottom with avatar, name, role, and quick logout button.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                Design Inspiration
              </h2>
              <p className="text-gray-600">
                This sidebar takes inspiration from modern SaaS applications like <strong>Slack</strong>, <strong>Notion</strong>, 
                and <strong>Linear</strong>, combining their best practices:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mt-3">
                <li>Slack's clean visual hierarchy and icon consistency</li>
                <li>Notion's collapsible sections and search functionality</li>
                <li>Linear's minimalistic design and blue accent color</li>
                <li>Modern spacing and padding for comfortable navigation</li>
                <li>Smooth hover states and transitions</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                Technical Implementation
              </h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Built with React and TypeScript for type safety</li>
                <li>Uses Tailwind CSS for consistent styling</li>
                <li>Lucide React icons for a cohesive icon set</li>
                <li>Shadcn/ui components for accessibility</li>
                <li>Responsive design ready for mobile adaptation</li>
                <li>State management for collapsible sections</li>
                <li>Real-time search filtering</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
