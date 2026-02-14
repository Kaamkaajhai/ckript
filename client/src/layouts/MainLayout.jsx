import Sidebar from "../components/Sidebar";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* mobile: no left margin, bottom padding for bottom bar. md: 72px sidebar. lg: 250px sidebar */}
      <main className="pb-20 md:pb-0 md:ml-[72px] lg:ml-[250px] min-h-screen">
        <div className="p-3 sm:p-5 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
