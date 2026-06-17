export function Footer() {
  return (
    <footer className="h-10 bg-[#f7f9fb] border-t border-[#e0c0b1] flex items-center justify-center shrink-0">
      <p className="text-xs text-[#515f74]">
        &copy; {new Date().getFullYear()} HRM System. All rights reserved.
      </p>
    </footer>
  )
}
