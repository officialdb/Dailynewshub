import Image from "next/image";

export default function ArticleEditor() {
  return (
    <div className="flex-1 p-margin">
      {/* Content Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Edit Article</h2>
          <p className="text-body-md text-secondary">Draft auto-saved 2 minutes ago</p>
        </div>
        <div className="flex items-center gap-stack-md">
          <button className="px-6 py-2.5 rounded-xl border border-outline text-on-surface font-label-md hover:bg-surface-container-high transition-colors cursor-pointer">
            Save Draft
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 shadow-md transition-all active:scale-95 cursor-pointer">
            Publish
          </button>
        </div>
      </div>

      {/* Bento Grid Layout for Editor */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Main Form Column (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">
          {/* Title & Category Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-2">Article Title</label>
                <input 
                  type="text" 
                  className="w-full text-headline-md font-headline-md border border-outline-variant rounded-xl p-4 focus:border-primary focus:ring-1 focus:ring-primary bg-surface-bright outline-none transition-all" 
                  placeholder="Enter title here..." 
                  defaultValue="Scaling Microservices in Enterprise Environments" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-2">Category</label>
                  <select className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary transition-all outline-none">
                    <option>Engineering</option>
                    <option selected>Architecture</option>
                    <option>Cloud Infrastructure</option>
                    <option>Product Design</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-2">Primary Author</label>
                  <div className="flex items-center gap-2 border border-outline-variant rounded-xl p-3 bg-surface-container-low text-body-md">
                    <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs text-primary">person</span>
                    </div>
                    <span>Current User (Admin)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rich Text Editor Simulated Area */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col min-h-[600px] shadow-sm overflow-hidden">
            {/* Editor Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-outline-variant bg-surface-container-low">
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_bold</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_italic</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_underlined</span></button>
              <div className="w-px h-6 bg-outline-variant mx-1"></div>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_align_left</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_align_center</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">format_align_right</span></button>
              <div className="w-px h-6 bg-outline-variant mx-1"></div>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">add_photo_alternate</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">link</span></button>
              <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex"><span className="material-symbols-outlined text-[20px]">code</span></button>
              <div className="flex-1"></div>
              <span className="text-xs text-secondary px-2">1,248 words</span>
            </div>
            
            {/* Editor Body */}
            <div className="p-8 flex-1 overflow-y-auto bg-surface-bright rich-text-shadow">
              <article className="prose prose-slate max-w-none">
                <p className="text-body-lg text-on-surface leading-relaxed mb-6">
                  In the modern digital landscape, the transition from monolithic architectures to microservices has become a standard for organizations seeking scalability, resilience, and accelerated development cycles. However, the complexity of managing these services at an enterprise scale introduces unique challenges...
                </p>
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">The Foundation of Scalability</h3>
                <p className="text-body-lg text-on-surface mb-6">
                  Scalability isn't just about handling more traffic; it's about doing so efficiently and without degradation of service quality. In a microservices ecosystem, this involves autonomous scaling of individual components based on real-time demand metrics.
                </p>
                <div className="bg-surface-container-high rounded-xl p-6 border-l-4 border-primary mb-6 italic text-on-surface-variant">
                  &quot;Architecture is the art of making trade-offs. Scaling microservices is the science of managing those trade-offs across distributed networks.&quot;
                </div>
                <p className="text-body-lg text-on-surface mb-6">
                  Consider the implementation of service meshes. These infrastructure layers provide managed, observable, and secure communication between services. Without a robust mesh, observability becomes fragmented, and troubleshooting latency issues across service boundaries becomes a daunting task for DevOps teams.
                </p>
                <p className="text-body-lg text-on-surface">Key considerations for architectural success include:</p>
                <ul className="list-disc ml-6 mt-4 space-y-2 text-body-lg text-on-surface">
                  <li>Automated service discovery mechanisms.</li>
                  <li>Circuit breaking patterns to prevent cascading failures.</li>
                  <li>Distributed tracing for end-to-end request visibility.</li>
                </ul>
              </article>
            </div>
          </div>
        </div>

        {/* Sidebar Settings Column (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-gutter">
          {/* Featured Image Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
            <h4 className="text-label-md font-bold text-on-surface mb-4">Featured Image</h4>
            <div className="relative group aspect-video bg-surface-container rounded-xl overflow-hidden border-2 border-dashed border-outline-variant flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all">
              <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7TINmXz0jvkaQKBZjOxvcUlEFD1Sc39vnM5We6nDrLxk-hlBJjEptQUogH_gGuLrVJjYoQFTUWINFpqX1qDvwHIsVnOQwgVgILHSNQml28BgooLxTnHQzf7rKhj6buAfUkhjd3fO1PYzvlEM0Z6zjAanZh8yG0PX0-6Wkgy4sksrSdcXej7eXYCDTD4xE04h7ugZU6-VhmqxhouWJnP7JYCnIafbdIzmv3iSzmVSFqH6UPjj37LbSqwjIXizyLQY9TlZ9iR-sadLR" alt="Cover" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="z-10 text-center bg-surface-container-lowest/90 px-4 py-2 rounded-lg shadow-lg">
                <span className="material-symbols-outlined text-primary mb-1">cloud_upload</span>
                <p className="text-xs font-bold text-primary">Replace Image</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-secondary text-center">Recommended size: 1200x630px (PNG, JPG)</p>
          </div>

          {/* SEO Settings Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
            <h4 className="text-label-md font-bold text-on-surface mb-4">SEO & Metadata</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">Meta Description</label>
                <textarea className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md h-24 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="Brief summary for search engines..."></textarea>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">SEO Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-container text-on-secondary-container rounded-lg text-[11px] font-bold">
                    Microservices <button className="hover:text-error cursor-pointer flex"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-container text-on-secondary-container rounded-lg text-[11px] font-bold">
                    Enterprise <button className="hover:text-error cursor-pointer flex"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-container text-on-secondary-container rounded-lg text-[11px] font-bold">
                    Architecture <button className="hover:text-error cursor-pointer flex"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                </div>
                <input type="text" className="w-full border border-outline-variant rounded-xl p-2 bg-surface-bright text-sm focus:ring-primary focus:border-primary outline-none" placeholder="Add tag..." />
              </div>
            </div>
          </div>

          {/* Visibility & Status Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
            <h4 className="text-label-md font-bold text-on-surface mb-4">Status & Visibility</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Public Visibility</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-container transition-colors focus:outline-none cursor-pointer">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Enable Comments</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-outline-variant transition-colors focus:outline-none cursor-pointer">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                </button>
              </div>
              <div className="pt-4 border-t border-outline-variant space-y-3">
                <div className="flex items-center gap-3 text-secondary">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs">Schedule: <strong className="text-on-surface">Post immediately</strong></span>
                </div>
                <div className="flex items-center gap-3 text-secondary">
                  <span className="material-symbols-outlined text-sm">language</span>
                  <span className="text-xs">Slug: <strong className="text-on-surface">/scaling-microservices</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="bg-tertiary-container/10 border border-tertiary-container/20 rounded-xl p-stack-lg">
            <p className="text-xs text-on-tertiary-fixed-variant mb-4 font-medium">Ready to go live? Your article meets all editorial guidelines.</p>
            <button className="w-full flex items-center justify-center gap-2 py-3 bg-tertiary-container text-on-tertiary-container font-bold rounded-xl hover:opacity-90 shadow-lg active:scale-95 transition-all cursor-pointer">
              <span className="material-symbols-outlined">rocket_launch</span>
              Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
